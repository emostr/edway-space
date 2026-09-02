#!/bin/sh
# Миграции накатываются перед стартом; учётные записи учителя заводят сами
# через свободную регистрацию, отдельного посева базы нет.
set -e
echo "==> prisma migrate deploy"
npx prisma migrate deploy
echo "==> запуск сервера"
exec node dist/main.js
