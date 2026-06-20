# ShareVibe Production Deployment

Bu workflow, doğrulama komutları geçmeden production dosyası yüklemez. Commit edilmiş credential okumaz ve secret değerlerini çıktıya yazmaz.

## Gerekli Runtime Değişkenleri

- `SHAREVIBE_DEPLOY_HOST`
- `SHAREVIBE_DEPLOY_PORT`
- `SHAREVIBE_DEPLOY_USER`
- `SHAREVIBE_DEPLOY_SSH_KEY_PATH`
- `SHAREVIBE_DEPLOY_PASSWORD`
- `SHAREVIBE_DEPLOY_PATH`
- `SHAREVIBE_DEPLOY_HEALTH_URL`

Local kullanım için `.deploy.env.example` dosyasını `.deploy.env` olarak kopyalayın. `.deploy.env` git tarafından ignore edilir.

## Komutlar

- `npm run deploy:check`: Gerekli değişkenleri değer yazdırmadan kontrol eder.
- `npm run deploy:discover`: Credential varsa sunucuda read-only production path keşfi yapar.
- `npm run deploy:health`: Ayarlı health URL’ini kontrol eder.
- `npm run deploy:production`: Access policy, rules, sitemap, test, build ve audit kontrollerinden sonra `dist/` içeriğini yedekli ve rollback destekli şekilde yayınlar.

## Sunucu Gereksinimleri

- SSH key kullanan non-root deploy kullanıcısı önerilir.
- Nginx config okunabiliyorsa autodiscovery çalışır; değilse `SHAREVIBE_DEPLOY_PATH` verilmelidir.
- Static web root ile sibling `releases/` ve `backups/` dizinlerine yazma izni gerekir.
- Lokal ve remote host üzerinde `tar` gerekir.
- Remote host üzerinde `rsync` önerilir; yoksa script yedek sonrası fallback kopyalama yolunu kullanır.

## Geçici Root Bootstrap

Root deployment varsayılan olarak engellidir. Sadece bir defalık bootstrap gerekiyorsa `SHAREVIBE_ALLOW_ROOT_BOOTSTRAP=1` ile açıkça izin verilmelidir. Bu kullanım geçici risk olarak değerlendirilir ve deploy sonrasında non-root deploy kullanıcısına geçilmelidir.
