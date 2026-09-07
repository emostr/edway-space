#!/bin/sh
# Миграции накатываются перед стартом. Свободной регистрации учителей нет:
# школы заводит владелец платформы или сама оплата, учителей — админ школы.
set -e

echo "==> prisma migrate deploy"
if ! npx prisma migrate deploy; then
	echo ""
	echo "  Миграции не легли на базу."
	echo ""
	echo "  Обычная причина — база осталась от прежней версии платформы, до"
	echo "  перехода на несколько школ: схема там другая, и наложить на неё"
	echo "  нынешние миграции нельзя."
	echo ""
	echo "  Дамп прежней базы деплой снимает сам, он в APP_DIR/backups."
	echo "  Если данные там больше не нужны, том с базой сносится так"
	echo "  (из каталога платформы, обычно /opt/edway):"
	echo ""
	echo "    sudo docker compose down"
	echo "    sudo docker volume rm \$(basename \$PWD)_pgdata"
	echo "    sudo docker compose up -d"
	echo ""
	exit 1
fi

echo "==> запуск сервера"
exec node dist/main.js
