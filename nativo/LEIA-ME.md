# Casca nativa do Prancheta FC

Capacitor 8. O jogo é o mesmo de `app/`; aqui mora só o que a loja exige e o que o navegador não dá.

## O que a camada nativa acrescenta

| Recurso | O que faz | Por que existe |
|---|---|---|
| Haptics | Vibração no gol a favor e no gol contra | No iPhone `navigator.vibrate` não existe, então sem isso o gol não dá retorno nenhum |
| Splash screen | Tela de abertura no verde do jogo, some quando a primeira tela aparece | Sem ela o app abre branco por um segundo |
| Status bar | Acompanha o tema claro ou escuro, inclusive se o sistema mudar com o app aberto | |
| Botão voltar (Android) | Fecha o painel, sai da partida, volta para a Central, e só então sai do app | Sem isso o botão voltar fecha o jogo no meio de uma partida |
| App lifecycle | Salva a carreira quando o app vai para segundo plano | O sistema pode matar o processo sem avisar |

Isso também é o que separa o app de um "site reempacotado", que é o motivo mais comum de recusa pela diretriz 4.2 da Apple (Minimum Functionality).

O código está em `jogo/nativo.js`. No navegador tudo vira função vazia, então o mesmo arquivo roda nos dois lugares.

## Como compilar: Codemagic, sem Mac

O build sai da nuvem do Codemagic, que roda em Mac mini deles. A configuração está em
`codemagic.yaml`, na raiz do repositório, com dois workflows: `ios` e `android`.

### O que precisa existir antes do primeiro build

| | O quê | Onde |
|---|---|---|
| 1 | Registro do app com o bundle ID `br.com.prancheta.fc` | App Store Connect |
| 2 | Chave de API do App Store Connect | **já existe**: `gize_asc` (Key ID PY3SJHBY46), conectada na conta |
| 3 | Integração do GitHub | **já existe**: pedromelocostaa-oss conectado |
| 4 | Repositório `brasfut` conectado | Codemagic > Add application |

A chave `gize_asc` é a mesma usada no Dito. Ela vale para qualquer app da conta, não é por app.

Para Android, enviar a keystore no Codemagic com o nome `prancheta_keystore`.

### Rodar

No Codemagic, escolher o workflow `ios` e **Start new build**. O resultado vai direto
para o TestFlight.

O workflow faz, nesta ordem: gera o `app/index.html` com o `jogo/build.py`, instala as
dependências do Capacitor, copia o jogo para dentro do projeto iOS, aplica os perfis de
assinatura, numera a compilação a partir da última que está no TestFlight, e compila o IPA.

### Detalhes do projeto que importam para o CI

- Capacitor 8 usa **Swift Package Manager**, não CocoaPods. Não existe `Podfile` nem
  `.xcworkspace`: o build é em cima de `nativo/ios/App/App.xcodeproj`.
- O scheme `App` está versionado em `xcshareddata`, senão o CI não acha.
- `webDir` aponta para `../app`, então o `cap sync` copia o mesmo arquivo que o site usa.

## Rodar na sua máquina (opcional)

Só se um dia você tiver um Mac com Xcode, ou para o Android com Android Studio.

```bash
cd nativo
npm install
npm run ios        # build do jogo + cap sync + abre o Xcode
npm run android    # build do jogo + cap sync + abre o Android Studio
```

`npm run sync` sozinho regenera o jogo e copia para as duas plataformas.

## Dados do app

| | |
|---|---|
| App ID | `br.com.prancheta.fc` |
| Nome | Prancheta FC |
| Orientação no iPhone | retrato apenas (o iPad fica livre) |
| Team ID da Apple | TPQTP5HK39 (pessoa física) |

`ITSAppUsesNonExemptEncryption` já está como `false` no Info.plist, então não aparece a
pergunta sobre criptografia a cada envio.
