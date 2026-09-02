#!/usr/bin/env bash
#
# Автоматическое развёртывание edway.space на Debian
# Ставит Docker и Caddy, собирает и запускает стек, настраивает HTTPS
# Все параметры задаются в deploy.conf (см. deploy.conf.example)
#
# Запуск:  sudo ./deploy.sh [--config FILE] [--check] [--skip-packages]

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deploy.conf"
CHECK_ONLY=no
SKIP_PACKAGES=no

CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_SITE_DIR=/etc/caddy/conf.d
CADDY_SITE_FILE="$CADDY_SITE_DIR/edway.caddy"
CADDY_IMPORT_LINE='import /etc/caddy/conf.d/*.caddy'
ERROR_PAGES_DIR=/var/www/edway-errors

if [[ -t 1 ]]; then
	C_RESET=$'\033[0m'; C_INFO=$'\033[36m'; C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'
else
	C_RESET=''; C_INFO=''; C_OK=''; C_WARN=''; C_ERR=''
fi

step() { printf '\n%s==>%s %s\n' "$C_INFO" "$C_RESET" "$*"; }
info() { printf '    %s\n' "$*"; }
ok() { printf '    %sготово%s %s\n' "$C_OK" "$C_RESET" "$*"; }
warn() { printf '%sвнимание:%s %s\n' "$C_WARN" "$C_RESET" "$*" >&2; }
die() { printf '%sошибка:%s %s\n' "$C_ERR" "$C_RESET" "$*" >&2; exit 1; }

trap 'die "сбой на строке $LINENO (команда: $BASH_COMMAND)"' ERR

usage() {
	cat <<'EOF'
Развёртывание платформы edway.space.

  sudo ./deploy.sh                  полное развёртывание (повторный запуск = обновление)
  sudo ./deploy.sh --check          проверить конфигурацию и окружение, ничего не менять
  sudo ./deploy.sh --skip-packages  не трогать apt-пакеты (Docker и Caddy уже стоят)
  ./deploy.sh --help                эта справка

  --config FILE                     путь к конфигурации (по умолчанию ./deploy.conf)
EOF
}

parse_args() {
	while [[ $# -gt 0 ]]; do
		case $1 in
			--config) [[ $# -ge 2 ]] || die "--config требует путь к файлу"; CONFIG_FILE=$2; shift 2 ;;
			--check) CHECK_ONLY=yes; shift ;;
			--skip-packages) SKIP_PACKAGES=yes; shift ;;
			-h|--help) usage; exit 0 ;;
			*) die "неизвестный аргумент: $1 (--help для справки)" ;;
		esac
	done
}

load_config() {
	[[ -f $CONFIG_FILE ]] || die "нет файла конфигурации $CONFIG_FILE — скопируйте deploy.conf.example в deploy.conf и заполните его"
	# shellcheck disable=SC1090
	source "$CONFIG_FILE"

	: "${DOMAIN:=}"
	: "${ACME_EMAIL:=}"
	: "${TLS_MODE:=auto}"
	: "${CADDY_STAGING:=no}"
	: "${APP_DIR:=$SCRIPT_DIR}"
	: "${HTTP_PORT:=8020}"
	: "${HTTP_BIND:=127.0.0.1}"
	: "${INSTALL_DOCKER:=yes}"
	: "${INSTALL_CADDY:=yes}"
	: "${DISABLE_NGINX:=yes}"
	: "${FIREWALL:=no}"
	: "${SSH_PORT:=22}"
	: "${POSTGRES_USER:=edway}"
	: "${POSTGRES_DB:=edway}"
	: "${SESSION_DAYS:=90}"
	: "${BACKUP_BEFORE_DEPLOY:=yes}"
	: "${BACKUP_KEEP:=10}"

	ENV_FILE="$APP_DIR/.env"
	BACKUP_DIR="$APP_DIR/backups"
}

validate_config() {
	[[ -n $DOMAIN ]] || die "в конфигурации не задан DOMAIN"
	[[ $DOMAIN =~ ^[A-Za-z0-9.-]+$ ]] || die "DOMAIN содержит недопустимые символы: $DOMAIN"
	[[ $HTTP_PORT =~ ^[0-9]+$ ]] || die "HTTP_PORT должен быть числом"
	[[ $SSH_PORT =~ ^[0-9]+$ ]] || die "SSH_PORT должен быть числом"
	[[ $SESSION_DAYS =~ ^[0-9]+$ ]] || die "SESSION_DAYS должен быть числом"

	case $TLS_MODE in
		auto)
			[[ -n $ACME_EMAIL ]] || die "при TLS_MODE=auto нужно указать ACME_EMAIL"
			[[ $ACME_EMAIL == *@*.* ]] || die "ACME_EMAIL не похож на адрес почты: $ACME_EMAIL"
			;;
		internal|off) ;;
		*) die "TLS_MODE может быть auto, internal или off (сейчас: $TLS_MODE)" ;;
	esac

	[[ -f $SCRIPT_DIR/docker-compose.yml ]] || die "рядом со скриптом нет docker-compose.yml — запускайте его из каталога проекта"
	ok "конфигурация корректна: $DOMAIN, TLS_MODE=$TLS_MODE, каталог $APP_DIR"
}

require_root() {
	[[ $EUID -eq 0 ]] || die "нужны права root: запустите через sudo"
}

detect_os() {
	[[ -f /etc/os-release ]] || die "не удалось определить дистрибутив (нет /etc/os-release)"
	# shellcheck disable=SC1091
	source /etc/os-release
	OS_ID=${ID:-unknown}
	OS_CODENAME=${VERSION_CODENAME:-}
	case $OS_ID in
		debian|ubuntu) ;;
		*) die "скрипт рассчитан на Debian или Ubuntu, обнаружено: $OS_ID" ;;
	esac
	[[ -n $OS_CODENAME ]] || die "не удалось определить кодовое имя выпуска ${OS_ID}"
	command -v systemctl >/dev/null || die "нужен systemd (systemctl не найден)"
	ok "система: ${PRETTY_NAME:-$OS_ID $OS_CODENAME}"
}

check_dns() {
	local server_ip domain_ip
	server_ip=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)
	domain_ip=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)
	if [[ -z $domain_ip ]]; then
		warn "домен $DOMAIN сейчас не резолвится — Let's Encrypt не сможет выдать сертификат, пока не появится A-запись"
		return
	fi
	if [[ -n $server_ip && $server_ip != "$domain_ip" ]]; then
		warn "домен $DOMAIN указывает на $domain_ip, а внешний адрес сервера — $server_ip; проверьте DNS"
	else
		ok "DNS: $DOMAIN → $domain_ip"
	fi
}

port_owner() {
	local port=$1
	ss -lntp "sport = :$port" 2>/dev/null | awk -F'"' 'NR > 1 && /users:/ {print $2; exit}' || true
}

check_ports() {
	local port owner
	for port in 80 443; do
		owner=$(port_owner "$port")
		[[ -z $owner ]] && continue
		case $owner in
			caddy) info "порт $port уже занят caddy — он будет перенастроен" ;;
			nginx) info "порт $port занят nginx — потребуется его отключить (DISABLE_NGINX=$DISABLE_NGINX)" ;;
			*) warn "порт $port занят процессом $owner — Caddy не сможет его открыть" ;;
		esac
	done
}

# Имя compose-проекта, под которым поднимается наш стек.
compose_project() {
	basename "$APP_DIR" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-'
}

# Проект контейнера, который сейчас публикует порт приложения.
# Пусто — порт свободен либо занят процессом вне Docker.
port_owner_project() {
	local holder
	holder=$(docker ps --filter "publish=$HTTP_PORT" --format '{{.ID}}' 2>/dev/null | head -n1 || true)
	[[ -z $holder ]] && return 0
	docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$holder" 2>/dev/null || true
}

# Порт приложения не должен быть занят посторонним: иначе Caddy отправит наш
# домен в чужое приложение, а проверки увидят чей-то честный ответ 200.
check_app_port() {
	local project
	project=$(port_owner_project)
	[[ -z $project ]] && return 0

	if [[ $project == "$(compose_project)" ]]; then
		info "порт $HTTP_PORT держит текущий стек — это обновление"
		return 0
	fi

	die "порт $HTTP_PORT уже занят контейнером другого проекта: $project
    На сервере, похоже, уже работает другая платформа. Укажите в $CONFIG_FILE
    свободный HTTP_PORT (например, $((HTTP_PORT + 10))) и запустите скрипт снова.
    Иначе Caddy для домена $DOMAIN будет проксировать запросы в чужое приложение."
}

apt_install() {
	local missing=()
	local pkg
	for pkg in "$@"; do
		dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q "ok installed" || missing+=("$pkg")
	done
	[[ ${#missing[@]} -eq 0 ]] && return 0
	info "устанавливаю: ${missing[*]}"
	DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${missing[@]}" >/dev/null
}

install_base_packages() {
	step "Базовые пакеты"
	info "обновляю списки пакетов"
	apt-get update -qq
	apt_install ca-certificates curl gnupg openssl git rsync iproute2 tar gzip \
		debian-keyring debian-archive-keyring apt-transport-https
	ok "базовые пакеты на месте"
}

install_docker() {
	step "Docker"
	if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
		ok "Docker и compose-плагин уже установлены ($(docker --version | awk '{print $3}' | tr -d ,))"
		return
	fi
	if [[ $INSTALL_DOCKER != yes ]]; then
		die "Docker не установлен, а INSTALL_DOCKER=no"
	fi
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL "https://download.docker.com/linux/$OS_ID/gpg" -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
		"$(dpkg --print-architecture)" "$OS_ID" "$OS_CODENAME" >/etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
	systemctl enable --now docker >/dev/null
	ok "Docker установлен"
}

install_caddy() {
	step "Caddy"
	if command -v caddy >/dev/null; then
		ok "Caddy уже установлен ($(caddy version | head -n1))"
		return
	fi
	if [[ $INSTALL_CADDY != yes ]]; then
		die "Caddy не установлен, а INSTALL_CADDY=no"
	fi
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
		| gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
		-o /etc/apt/sources.list.d/caddy-stable.list
	apt-get update -qq
	apt_install caddy
	systemctl enable caddy >/dev/null
	ok "Caddy установлен"
}

backup_path() {
	local src=$1 name
	name=$(basename "$src")
	name=${name#.}
	mkdir -p "$BACKUP_DIR"
	cp -a "$src" "$BACKUP_DIR/${name}.$(date +%Y%m%d-%H%M%S).bak"
}

disable_nginx() {
	systemctl is-enabled nginx >/dev/null 2>&1 || systemctl is-active --quiet nginx || return 0
	step "Миграция с nginx"
	if [[ $DISABLE_NGINX != yes ]]; then
		warn "nginx оставлен включённым (DISABLE_NGINX=no) — Caddy не сможет занять порты 80/443"
		return
	fi
	if [[ -d /etc/nginx ]]; then
		mkdir -p "$BACKUP_DIR"
		local archive
		archive="$BACKUP_DIR/nginx-config-$(date +%Y%m%d-%H%M%S).tar.gz"
		tar -czf "$archive" -C /etc nginx
		info "конфигурация nginx сохранена: $archive"
	fi
	systemctl disable --now nginx >/dev/null 2>&1 || true
	ok "nginx остановлен и убран из автозапуска"
	if systemctl list-unit-files 'certbot*' 2>/dev/null | grep -q certbot; then
		systemctl disable --now certbot.timer >/dev/null 2>&1 || true
		info "таймер certbot отключён: сертификаты теперь ведёт Caddy"
	fi
}

sync_sources() {
	[[ $APP_DIR == "$SCRIPT_DIR" ]] && return 0
	step "Копирование исходников в $APP_DIR"
	mkdir -p "$APP_DIR"
	rsync -a --delete \
		--exclude '.git/' --exclude 'node_modules/' --exclude 'dist/' --exclude 'build/' \
		--exclude '.next/' --exclude 'test-results/' --exclude 'playwright-report/' \
		--exclude '.env' --exclude 'deploy.conf' --exclude 'backups/' \
		"$SCRIPT_DIR"/ "$APP_DIR"/
	cp -f "$CONFIG_FILE" "$APP_DIR/deploy.conf"
	ok "исходники синхронизированы"
}

gen_secret() {
	local raw
	raw=$(openssl rand -base64 64 | tr -dc 'A-Za-z0-9')
	printf '%s' "${raw:0:${1:-32}}"
}

env_value() {
	local key=$1 line
	[[ -f $ENV_FILE ]] || return 1
	line=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -n1) || return 1
	[[ -n $line ]] || return 1
	printf '%s' "${line#*=}"
}

resolve_secret() {
	local name=$1
	local configured="${!name:-}"
	local existing
	existing=$(env_value "$name" || true)
	if [[ -n $configured ]]; then
		if [[ -n $existing && $existing != "$configured" ]]; then
			warn "$name в deploy.conf отличается от значения в .env — будет записано значение из deploy.conf"
		fi
		printf '%s' "$configured"
	elif [[ -n $existing ]]; then
		printf '%s' "$existing"
	else
		gen_secret 32
	fi
}

write_env() {
	step "Файл окружения"
	local scheme=https
	[[ $TLS_MODE == off ]] && scheme=http

	local db_pass jwt
	db_pass=$(resolve_secret POSTGRES_PASSWORD)
	jwt=$(resolve_secret JWT_SECRET)

	[[ -f $ENV_FILE ]] && backup_path "$ENV_FILE"

	cat >"$ENV_FILE" <<EOF
# Создано deploy.sh $(date '+%Y-%m-%d %H:%M:%S'). Правки перезапишутся при следующем запуске:
# меняйте значения в deploy.conf.

POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$db_pass
POSTGRES_DB=$POSTGRES_DB

JWT_SECRET=$jwt
PUBLIC_URL=$scheme://$DOMAIN
HTTP_PORT=$HTTP_PORT
HTTP_BIND=$HTTP_BIND

SESSION_DAYS=$SESSION_DAYS
EOF
	chmod 600 "$ENV_FILE"
	ok "записан $ENV_FILE"
}

backup_database() {
	[[ $BACKUP_BEFORE_DEPLOY == yes ]] || return 0
	local container
	container=$(cd "$APP_DIR" && docker compose ps -q postgres 2>/dev/null || true)
	[[ -n $container ]] || return 0
	docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null | grep -q true || return 0

	step "Резервная копия базы"
	mkdir -p "$BACKUP_DIR"
	local dump
	dump="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql.gz"
	if docker exec "$container" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null | gzip >"$dump"; then
		ok "дамп сохранён: $dump ($(du -h "$dump" | cut -f1))"
	else
		rm -f "$dump"
		warn "не удалось снять дамп базы — развёртывание продолжается"
	fi
	# shellcheck disable=SC2012
	ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm -f || true
}

# Сканы работ и картинки заданий лежат в томе, а не в базе: дамп их не спасёт.
backup_uploads() {
	[[ $BACKUP_BEFORE_DEPLOY == yes ]] || return 0
	local container
	container=$(cd "$APP_DIR" && docker compose ps -q backend 2>/dev/null || true)
	[[ -n $container ]] || return 0
	docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null | grep -q true || return 0

	step "Резервная копия загруженных файлов"
	mkdir -p "$BACKUP_DIR"
	local archive
	archive="$BACKUP_DIR/uploads-$(date +%Y%m%d-%H%M%S).tar.gz"
	if docker exec "$container" tar -czf - -C /data uploads 2>/dev/null >"$archive"; then
		ok "архив сохранён: $archive ($(du -h "$archive" | cut -f1))"
	else
		rm -f "$archive"
		warn "не удалось заархивировать загрузки — развёртывание продолжается"
	fi
	# shellcheck disable=SC2012
	ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm -f || true
}

deploy_stack() {
	step "Сборка и запуск контейнеров"
	cd "$APP_DIR"
	docker compose build --pull
	docker compose up -d --remove-orphans
	ok "стек запущен"
}

wait_for_app() {
	step "Проверка приложения"
	local host=$HTTP_BIND
	[[ $host == 0.0.0.0 || $host == '::' ]] && host=127.0.0.1
	local code
	for _ in $(seq 1 60); do
		code=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "http://$host:$HTTP_PORT/" 2>/dev/null || true)
		if [[ $code == 200 ]]; then
			ok "фронтенд отвечает на http://$host:$HTTP_PORT/"
			break
		fi
		sleep 2
	done
	[[ $code == 200 ]] || { cd "$APP_DIR" && docker compose ps; die "приложение не поднялось за 2 минуты — смотрите: cd $APP_DIR && docker compose logs"; }

	# Кто на самом деле держит порт, решаем по метке compose-проекта: это
	# надёжнее, чем гадать по телу ответа. Тело нужно лишь тогда, когда порт
	# держит процесс вне Docker и метки взять неоткуда.
	local project
	project=$(port_owner_project)
	if [[ -n $project && $project != "$(compose_project)" ]]; then
		die "порт $HTTP_PORT держит контейнер другого проекта: $project
    Caddy отправит домен $DOMAIN в чужое приложение. Укажите свободный
    HTTP_PORT в $CONFIG_FILE и запустите скрипт снова."
	fi

	local body
	for _ in $(seq 1 30); do
		body=$(curl -fsS --max-time 5 "http://$host:$HTTP_PORT/api/health" 2>/dev/null || true)
		# Метка app появилась не сразу: сборки постарше отдают health без неё,
		# и это по-прежнему мы. Признаём и такой ответ.
		if [[ $body == *'"app":"edway"'* ]]; then
			ok "API отвечает и видит базу"
			[[ $body == *'"ocr":"ok"'* ]] \
				|| warn "tesseract в образе не найден — автопроверка бланков работать не будет"
			return 0
		fi
		if [[ -n $body && -z $project ]]; then
			die "на порту $HTTP_PORT отвечает не edway.space:
    $body
    Порт занят посторонним процессом. Укажите свободный HTTP_PORT
    в $CONFIG_FILE и запустите скрипт снова."
		fi
		sleep 2
	done
	warn "API пока не отвечает на /api/health — проверьте: cd $APP_DIR && docker compose logs backend"
}

ensure_caddy_import() {
	mkdir -p "$CADDY_SITE_DIR"
	if [[ ! -f $CADDY_MAIN ]]; then
		printf '# Управляется edway deploy.sh\n%s\n' "$CADDY_IMPORT_LINE" >"$CADDY_MAIN"
		return
	fi
	grep -qF "$CADDY_IMPORT_LINE" "$CADDY_MAIN" && return
	backup_path "$CADDY_MAIN"
	if grep -q 'The Caddyfile is an easy way' "$CADDY_MAIN"; then
		printf '# Управляется edway deploy.sh\n%s\n' "$CADDY_IMPORT_LINE" >"$CADDY_MAIN"
		info "стандартный Caddyfile заменён на импорт conf.d"
	else
		printf '\n%s\n' "$CADDY_IMPORT_LINE" >>"$CADDY_MAIN"
		warn "в $CADDY_MAIN дописана строка импорта conf.d — проверьте, что она не конфликтует с вашими сайтами"
	fi
}

install_error_pages() {
	local src="$APP_DIR/frontend/public/errors"
	local pages=("$src"/*.html)
	if [[ ! -e ${pages[0]} ]]; then
		warn "не найдены страницы ошибок в $src — Caddy будет отдавать стандартные ответы"
		return 0
	fi
	mkdir -p "$ERROR_PAGES_DIR"
	install -m 0644 "${pages[@]}" "$ERROR_PAGES_DIR"/
	info "страницы ошибок: $ERROR_PAGES_DIR (${#pages[@]} шт.)"
}

write_caddy_site() {
	step "Настройка Caddy"
	ensure_caddy_import
	install_error_pages
	mkdir -p /var/log/caddy
	chown caddy:caddy /var/log/caddy 2>/dev/null || true

	local site_address="$DOMAIN" tls_block=''
	case $TLS_MODE in
		auto)
			if [[ $CADDY_STAGING == yes ]]; then
				tls_block=$'\ttls '"$ACME_EMAIL"$' {\n\t\tca https://acme-staging-v02.api.letsencrypt.org/directory\n\t}\n'
			else
				tls_block=$'\ttls '"$ACME_EMAIL"$'\n'
			fi
			;;
		internal) tls_block=$'\ttls internal\n' ;;
		off) site_address="http://$DOMAIN" ;;
	esac

	[[ -f $CADDY_SITE_FILE ]] && backup_path "$CADDY_SITE_FILE"
	{
		printf '# Управляется edway deploy.sh — правки перезапишутся при следующем запуске.\n'
		printf '%s {\n' "$site_address"
		[[ -n $tls_block ]] && printf '%s' "$tls_block"
		printf '\tencode zstd gzip\n\n'
		printf '\trequest_body {\n\t\tmax_size 8MB\n\t}\n\n'
		printf '\tlog {\n\t\toutput file /var/log/caddy/edway.log\n\t}\n\n'
		printf '\treverse_proxy 127.0.0.1:%s\n\n' "$HTTP_PORT"
		printf '\thandle_errors {\n'
		printf '\t\troot * %s\n\n' "$ERROR_PAGES_DIR"
		printf '\t\t@page expression {err.status_code} in [401, 403, 502]\n'
		printf '\t\thandle @page {\n\t\t\trewrite * /{err.status_code}.html\n\t\t\tfile_server {\n\t\t\t\tstatus {err.status_code}\n\t\t\t}\n\t\t}\n\n'
		printf '\t\t@server_error expression {err.status_code} >= 500\n'
		printf '\t\thandle @server_error {\n\t\t\trewrite * /500.html\n\t\t\tfile_server {\n\t\t\t\tstatus {err.status_code}\n\t\t\t}\n\t\t}\n\n'
		printf '\t\thandle {\n\t\t\trespond "{err.status_code} {err.status_text}" {err.status_code}\n\t\t}\n'
		printf '\t}\n'
		printf '}\n'
	} >"$CADDY_SITE_FILE"

	caddy validate --adapter caddyfile --config "$CADDY_MAIN" >/dev/null 2>&1 \
		|| die "Caddy не принял конфигурацию: caddy validate --config $CADDY_MAIN"
	ok "записан $CADDY_SITE_FILE"

	systemctl enable caddy >/dev/null 2>&1 || true
	if systemctl is-active --quiet caddy; then
		systemctl reload caddy
		ok "Caddy перечитал конфигурацию"
	else
		systemctl start caddy
		ok "Caddy запущен"
	fi
}

configure_firewall() {
	[[ $FIREWALL == ufw ]] || return 0
	step "Фаервол"
	apt_install ufw
	ufw allow "$SSH_PORT/tcp" >/dev/null
	ufw allow 80/tcp >/dev/null
	ufw allow 443/tcp >/dev/null
	ufw --force enable >/dev/null
	ok "ufw включён: открыты $SSH_PORT, 80, 443"
}

wait_for_https() {
	[[ $TLS_MODE == off ]] && return 0
	step "Проверка HTTPS"
	local curl_opts=(-fsS -o /dev/null --max-time 10)
	[[ $TLS_MODE == internal || $CADDY_STAGING == yes ]] && curl_opts+=(-k)
	local code
	for _ in $(seq 1 24); do
		code=$(curl "${curl_opts[@]}" -w '%{http_code}' "https://$DOMAIN/" 2>/dev/null || true)
		if [[ $code == 200 ]]; then
			ok "https://$DOMAIN/ отвечает"
			return 0
		fi
		sleep 5
	done
	warn "https://$DOMAIN/ пока не отвечает. Проверьте DNS и журнал: journalctl -u caddy -n 50"
}

summary() {
	local scheme=https
	[[ $TLS_MODE == off ]] && scheme=http

	printf '\n%s==> Развёртывание завершено%s\n\n' "$C_OK" "$C_RESET"
	printf '  Адрес:            %s://%s\n' "$scheme" "$DOMAIN"
	printf '  Каталог:          %s\n' "$APP_DIR"
	printf '  Секреты:          %s (права 600)\n' "$ENV_FILE"
	printf '  Конфиг Caddy:     %s\n' "$CADDY_SITE_FILE"
	printf '  Резервные копии:  %s\n\n' "$BACKUP_DIR"
	printf '  Регистрация свободная: учитель заводит кабинет сам на странице /register,\n'
	printf '  логин платформа собирает транслитом и показывает сразу после регистрации.\n\n'
	printf '  Логи приложения:  cd %s && docker compose logs -f\n' "$APP_DIR"
	printf '  Логи Caddy:       journalctl -u caddy -f\n'
	printf '  Обновление:       sudo %s/deploy.sh\n\n' "$APP_DIR"
}

main() {
	parse_args "$@"
	load_config
	validate_config

	if [[ $CHECK_ONLY == yes ]]; then
		step "Проверка окружения"
		[[ $EUID -eq 0 ]] || warn "скрипт запущен не от root: для развёртывания понадобится sudo"
		detect_os
		check_dns
		[[ $EUID -eq 0 ]] && check_ports
		if command -v docker >/dev/null; then ok "docker: $(docker --version)"; check_app_port; else info "docker будет установлен"; fi
		if command -v caddy >/dev/null; then ok "caddy: $(caddy version | head -n1)"; else info "caddy будет установлен"; fi
		printf '\n%sПроверка пройдена, изменений не вносилось.%s\n\n' "$C_OK" "$C_RESET"
		exit 0
	fi

	require_root
	detect_os
	check_dns
	check_ports

	if [[ $SKIP_PACKAGES == no ]]; then
		install_base_packages
		install_docker
		install_caddy
	else
		info "установка пакетов пропущена (--skip-packages)"
		command -v docker >/dev/null || die "Docker не установлен"
		command -v caddy >/dev/null || die "Caddy не установлен"
	fi

	check_app_port
	disable_nginx
	sync_sources
	mkdir -p "$BACKUP_DIR"
	backup_database
	backup_uploads
	write_env
	deploy_stack
	wait_for_app
	write_caddy_site
	configure_firewall
	wait_for_https
	summary
}

main "$@"
