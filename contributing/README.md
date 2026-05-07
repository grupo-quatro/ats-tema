
# instalar las dependencias del proyecto

npm, node v22.14

`npm install -g pnpm firebase-tools`

# instalar las dependencias del proyecto
`pnpm install`


## Loggearse en firebase
`firebase login` // con cuenta grupo.quatro.ort@gmail.com

## verfiicar que anda

`pnpm install`

`pnpm audit --fix` // corregir dependencias desactualizadas

`pnpm turbo run build --filter=@ats/functions` // compilar funciones script `compile-fn`

`pnpm turbo run dev --filter=@ats/web` o script `dev-web` //levantar next.js en dev

## Levantar emuladores de firebase
`firebase init emulators`//correr emuladores de firebase

`firebase emulators:start`
