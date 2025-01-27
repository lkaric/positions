# Positions

### Setup

1. Install the dependencies (Node v22.13.0)

```sh
$ pnpm install
```

2. Provide the environment variables

```sh
$ cp .env.example > .env.local
```

3. Run the development environment

```sh
$ pnpm run dev
```

### About

The Positions app is a minimal application created with a purpose of displaying existing positions on the MakerDAO protocol. Main functionalities include:

- Switching the provider between Infura and Metamask.
- Filtering by the Position/Vault ID and Collateral Type.
- Auto-scaling of the positions/vaults if the current range does not include enough entries of the required collateral type.
- Auto-retry if the given position/vault fails for a configurable amount of attempts with exponential backoff.
