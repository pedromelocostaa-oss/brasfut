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

## Como rodar

Precisa de macOS com Xcode para iOS, e Android Studio para Android.

```bash
cd nativo
npm install
npm run ios        # build do jogo + cap sync + abre o Xcode
npm run android    # build do jogo + cap sync + abre o Android Studio
```

`npm run sync` sozinho regenera o jogo e copia para as duas plataformas, sem abrir nada.

## Dados do app

| | |
|---|---|
| App ID | `br.com.prancheta.fc` |
| Nome | Prancheta FC |
| Orientação no iPhone | retrato apenas (o iPad fica livre) |
| Team ID da Apple | TPQTP5HK39 (pessoa física) |

`ITSAppUsesNonExemptEncryption` já está como `false` no Info.plist, então o Xcode não pergunta sobre criptografia a cada envio.

## Primeiro envio para o TestFlight

1. `npm run ios`
2. No Xcode: selecionar o alvo **App**, aba **Signing & Capabilities**, marcar *Automatically manage signing* e escolher o time
3. Menu **Product > Destination > Any iOS Device (arm64)**
4. **Product > Archive**
5. Na janela do Organizer: **Distribute App > TestFlight & App Store**
6. No App Store Connect, criar o app com o mesmo bundle ID e liberar a compilação para os testadores

Teste interno (até 100 pessoas do seu time) não passa por revisão. Teste externo passa por uma revisão curta.
