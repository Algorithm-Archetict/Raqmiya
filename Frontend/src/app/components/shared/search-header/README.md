# Search Header Component

A reusable search header component that provides a consistent search and filtering interface across the platform.

## Features

- **Search Functionality**: Real-time search with input field
- **Category Filtering**: Pre-defined category buttons (All, 3D Design, Design, Sound, More)
- **Responsive Design**: Works on all screen sizes
- **Event Emitters**: Emits search and category filter changes to parent components
- **Consistent Styling**: Uses the platform's design system variables

## Usage

### Basic Implementation

```typescript
import { SearchHeader } from '../shared/search-header/search-header';

@Component({
  selector: 'app-my-component',
  imports: [SearchHeader],
  template: `
    <app-search-header
      (searchQueryChange)="onSearch($event)"
      (categoryFilterChange)="filterByCategory($event)"
    ></app-search-header>
  `
})
export class MyComponent {
  onSearch(query: string) {
    // Handle search query changes
    console.log('Search query:', query);
  }

  filterByCategory(category: string) {
    // Handle category filter changes
    console.log('Selected category:', category);
  }
}
```

### Available Events

- `searchQueryChange`: Emitted when the user types in the search input
- `categoryFilterChange`: Emitted when the user clicks a category filter button

### Available Categories

- `'all'`: Shows all products
- `'3d'`: 3D Design products
- `'design'`: Design products
- `'sound'`: Sound products
- `'other'`: Other categories

## Styling

The component uses CSS custom properties (variables) for consistent theming:

- `--bg-secondary`, `--bg-tertiary`: Background colors
- `--text-primary`, `--text-secondary`: Text colors
- `--epic-blue`: Primary accent color
- `--border-color`: Border colors
- `--radius-lg`, `--radius-xl`: Border radius values
- `--spacing-*`: Spacing values
- `--transition-normal`: Transition timing

## Responsive Behavior

- **Desktop**: Full search bar with all category buttons visible
- **Tablet**: Responsive layout with adjusted spacing
- **Mobile**: Stacked layout with full-width category buttons

## Examples

### Discover Page
The search header is currently used in the discover page to provide product search and filtering functionality.

### Browse Page
A new browse page demonstrates how to implement the search header in a different context with a product grid layout.

## Notes

- The component is designed to be used on pages that need search functionality
- It's not suitable for pages with sidebar layouts (like dashboard, library, settings)
- The component emits events rather than managing state internally for maximum flexibility
- All styling is self-contained and doesn't interfere with parent component styles 