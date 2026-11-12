# Cómo contribuir

## Ramas

- `main` siempre desplegable; nadie empuja directo: todo entra por PR.
- Ramas de trabajo: `feat/<tema>`, `fix/<tema>`, `chore/<tema>`, `docs/<tema>`.

## Commits

[Conventional Commits 1.0](https://www.conventionalcommits.org/es/v1.0.0/), en español:

```
tipo(alcance opcional): descripción en minúscula y en presente

Cuerpo opcional: qué cambia y por qué (no cómo).
```

Tipos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
Un cambio incompatible lleva `!` (`feat!: ...`) o `BREAKING CHANGE:` en el cuerpo. El hook
`commit-msg` (commitlint) rechaza los mensajes que no cumplen.

## Antes de abrir un PR

Los hooks de lefthook revisan formato y lint al hacer commit, y corren los tests al hacer push.
Además:

```bash
pnpm verify   # formato, lint, tests con cobertura y build
pnpm e2e      # si el cambio toca la carga de la app, el nginx o la seguridad
```

## Revisión

- Todo PR pasa el CI (verificación, e2e y análisis de seguridad) y una revisión.
- Cambios que tocan seguridad (CSP, sesión, permisos, `nginx/`) se señalan en la descripción.
- No se agregan dependencias sin justificarlas en el PR: cada una amplía la superficie de ataque.
