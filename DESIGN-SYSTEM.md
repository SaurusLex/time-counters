# Design System - Time Counters

Sistema de diseño basado en tokens CSS con grid de 4px.

## Tokens

### Spacing (grid 4px)

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-1` | 4px | gap mínimo, padding compacto |
| `--space-2` | 8px | padding inputs, gap estándar |
| `--space-3` | 12px | margin entre secciones |
| `--space-4` | 16px | padding contenedores |
| `--space-5` | 20px | padding cards |
| `--space-6` | 24px | padding página |
| `--space-7` | 28px | padding alternativo |
| `--space-8` | 32px | botón icono, iconos medianos |
| `--space-10` | 40px | altura botones |
| `--space-14` | 56px | footer modal |
| `--space-20` | 80px | min-height modales |

### Tamaños (iconos / botones)

| Token | Valor | Uso |
|-------|-------|-----|
| `--size-icon-xs` | 14px | iconos muy pequeños |
| `--size-icon-sm` | 16px | iconos dentro de botón icono |
| `--size-icon-md` | 20px | iconos estándar |
| `--size-icon-lg` | 24px | iconos destacados |
| `--size-icon-xl` | 32px | iconos grandes |
| `--size-btn-xs` | 24px | botón xs |
| `--size-btn-sm` | 32px | botón sm (icono) |
| `--size-btn-md` | 40px | botón md (estándar) |
| `--size-btn-lg` | 48px | botón lg |
| `--size-input` | 40px | altura input, select |

### Border radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 4px | inputs, botones |
| `--radius-md` | 6px | cards pequeñas |
| `--radius-lg` | 8px | cards, modales |
| `--radius-xl` | 12px | modales grandes |
| `--radius-full` | 50% | botones circulares |

### Breakpoints

| Token | Valor |
|-------|-------|
| `--bp-sm` | 500px |
| `--bp-md` | 600px |
| `--bp-lg` | 700px |

> CSS no permite variables en media queries; usar valores literales.

## Botones

- **size**: xs (24px), sm (32px), md (40px), lg (48px)
- **shape**: default (rectangular), circle (circular)
- Ejemplo icono circular: `size="sm" shape="circle"`

## Uso

```css
.mi-componente {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  gap: var(--space-2);
}
```
