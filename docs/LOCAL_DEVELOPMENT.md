# Local Development

## Application

```sh
npm install
npm run dev
```

The default port is `3003`. In-memory demo data works without database configuration.

## Checks

```sh
npm test
npm run lint
npm run build
```

## Contract

```sh
cd contracts/batch-payroll
cargo test
cargo build --release --target wasm32v1-none
```

Use `.env.example` as a reference and keep all secret seeds outside the project.
