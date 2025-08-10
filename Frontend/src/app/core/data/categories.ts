
// This file contains the static category data that mirrors the database structure.
// The IDs must match the IDs in your SQL database.

export interface Category {
  id: number;
  name: string;
  parentId?: number | null;
  subcategories?: Category[];
}

// Helper function to build hierarchical structure from flat array
export function buildCategoryHierarchy(categories: Category[]): Category[] {
  const categoryMap = new Map<number, Category>();
  const rootCategories: Category[] = [];

  // Create a map of all categories
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, subcategories: [] });
  });

  // Build the hierarchy
  categories.forEach(category => {
    const categoryWithSubcategories = categoryMap.get(category.id)!;
    
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.subcategories!.push(categoryWithSubcategories);
      }
    } else {
      rootCategories.push(categoryWithSubcategories);
    }
  });

  return rootCategories;
}

export const CATEGORIES: Category[] = [
  // Parent Categories
  { id: 1, name: 'Fitness & Health' },
  { id: 2, name: 'Self Improvement' },
  { id: 3, name: 'Writings & Publishing & Education' },
  { id: 4, name: 'Business & Money' },
  { id: 5, name: 'Drawing & Painting' },
  { id: 6, name: '3D' },
  { id: 7, name: 'Music & Sound Design' },
  { id: 8, name: 'Films' },
  { id: 9, name: 'Software Development' },
  { id: 10, name: 'Gaming' },
  { id: 11, name: 'Photography' },
  { id: 12, name: 'Comics & Graphic Novels' },
  { id: 13, name: 'Fiction Books' },
  { id: 14, name: 'Education' },
  { id: 15, name: 'Design' },
  { id: 110, name: 'Audio' },
  { id: 111, name: 'Recorded Music' },

  // Subcategories - Fitness & Health (ParentId: 1)
  { id: 16, name: 'Exercise & Workout', parentId: 1 },
  { id: 17, name: 'Running', parentId: 1 },
  { id: 18, name: 'Sports', parentId: 1 },
  { id: 19, name: 'Weight Loss', parentId: 1 },
  { id: 20, name: 'Yoga', parentId: 1 },

  // Subcategories - Self Improvement (ParentId: 2)
  { id: 21, name: 'Cooking', parentId: 2 },
  { id: 22, name: 'Crafts & DYI', parentId: 2 },
  { id: 23, name: 'Dating & Relationships', parentId: 2 },
  { id: 24, name: 'Outdoors', parentId: 2 },
  { id: 25, name: 'Philosophy', parentId: 2 },
  { id: 26, name: 'Productivity', parentId: 2 },
  { id: 27, name: 'Psychology', parentId: 2 },
  { id: 28, name: 'Spirituality', parentId: 2 },
  { id: 29, name: 'Travel', parentId: 2 },
  { id: 30, name: 'Wedding', parentId: 2 },
  { id: 31, name: 'Wellness', parentId: 2 },

  // Subcategories - Writings & Publishing & Education (ParentId: 3)
  { id: 32, name: 'Courses', parentId: 3 },
  { id: 33, name: 'Resourses', parentId: 3 },

  // Subcategories - Business & Money (ParentId: 4)
  { id: 34, name: 'Accounting', parentId: 4 },
  { id: 35, name: 'Entrepreneurship', parentId: 4 },
  { id: 36, name: 'Gigs & Side Projects', parentId: 4 },
  { id: 37, name: 'Investing', parentId: 4 },
  { id: 38, name: 'Managment & LeaderShip', parentId: 4 },
  { id: 39, name: 'Marketing & Sales', parentId: 4 },
  { id: 40, name: 'Personal Finance', parentId: 4 },
  { id: 41, name: 'Real State', parentId: 4 },

  // Subcategories - Drawing & Painting (ParentId: 5)
  { id: 42, name: 'Artwork Commisions', parentId: 5 },
  { id: 43, name: 'Digital Illustration', parentId: 5 },
  { id: 44, name: 'Tradititional Art', parentId: 5 },

  // Subcategories - 3D (ParentId: 6)
  { id: 45, name: '3D Assets', parentId: 6 },
  { id: 46, name: '3D Modeling', parentId: 6 },
  { id: 47, name: 'Animating', parentId: 6 },
  { id: 48, name: 'AR/VR', parentId: 6 },
  { id: 49, name: 'Avatars', parentId: 6 },
  { id: 50, name: 'Character Design', parentId: 6 },
  { id: 51, name: 'Rigging', parentId: 6 },
  { id: 52, name: 'Texture', parentId: 6 },
  { id: 53, name: 'VRChat', parentId: 6 },

  // Subcategories - Music & Sound Design (ParentId: 7)
  { id: 54, name: 'Dance & Theater', parentId: 7 },
  { id: 55, name: 'Instruments', parentId: 7 },
  { id: 56, name: 'Sound Design', parentId: 7 },
  { id: 57, name: 'Vocal', parentId: 7 },

  // Subcategories - Films (ParentId: 8)
  { id: 58, name: 'Comedy', parentId: 8 },
  { id: 59, name: 'Dance', parentId: 8 },
  { id: 60, name: 'Documentary', parentId: 8 },
  { id: 61, name: 'Movie', parentId: 8 },
  { id: 62, name: 'Performance', parentId: 8 },
  { id: 63, name: 'Short Film', parentId: 8 },
  { id: 64, name: 'Sports Events', parentId: 8 },
  { id: 65, name: 'Theatre', parentId: 8 },
  { id: 66, name: 'Video Production & Editing', parentId: 8 },
  { id: 67, name: 'Videography', parentId: 8 },

  // Subcategories - Software Development (ParentId: 9)
  { id: 68, name: 'App Development', parentId: 9 },
  { id: 69, name: 'Hardware', parentId: 9 },
  { id: 70, name: 'Programming', parentId: 9 },
  { id: 71, name: 'Software & Plugins', parentId: 9 },
  { id: 72, name: 'Web Development', parentId: 9 },

  // Subcategories - Gaming (ParentId: 10)
  { id: 73, name: 'Streaming', parentId: 10 },

  // Subcategories - Photography (ParentId: 11)
  { id: 74, name: 'Cosplay', parentId: 11 },
  { id: 75, name: 'Photo Courses', parentId: 11 },
  { id: 76, name: 'Photo Presets & Actions', parentId: 11 },
  { id: 77, name: 'Reference Photos', parentId: 11 },
  { id: 78, name: 'Stock Photos', parentId: 11 },

  // Subcategories - Fiction Books (ParentId: 13)
  { id: 79, name: 'Children\'s Books', parentId: 13 },
  { id: 80, name: 'Fantasy', parentId: 13 },
  { id: 81, name: 'Mystery', parentId: 13 },
  { id: 82, name: 'Romance', parentId: 13 },
  { id: 83, name: 'Science Fiction & Young Adult', parentId: 13 },

  // Subcategories - Education (ParentId: 14)
  { id: 84, name: 'Classroom', parentId: 14 },
  { id: 85, name: 'English', parentId: 14 },
  { id: 86, name: 'History', parentId: 14 },
  { id: 87, name: 'Math', parentId: 14 },
  { id: 88, name: 'Science', parentId: 14 },
  { id: 89, name: 'Social Studies', parentId: 14 },
  { id: 90, name: 'Specialties', parentId: 14 },
  { id: 91, name: 'Test Prep', parentId: 14 },

  // Subcategories - Design (ParentId: 15)
  { id: 92, name: 'Architecture', parentId: 15 },
  { id: 93, name: 'Branding Entertainment Design', parentId: 15 },
  { id: 94, name: 'Fashion Design', parentId: 15 },
  { id: 95, name: 'Fonts', parentId: 15 },
  { id: 96, name: 'Graphics', parentId: 15 },
  { id: 97, name: 'Icons', parentId: 15 },
  { id: 98, name: 'Industrial Design', parentId: 15 },
  { id: 99, name: 'Interior Design', parentId: 15 },
  { id: 100, name: 'Print & Packaging', parentId: 15 },
  { id: 101, name: 'UI & Web', parentId: 15 },
  { id: 102, name: 'Wallpapers', parentId: 15 },

  // Sub-subcategories
  { id: 103, name: 'Courses', parentId: 35 },
  { id: 104, name: 'Podcasts', parentId: 35 },
  { id: 105, name: 'Resourses', parentId: 35 },
  { id: 106, name: 'Nutrition', parentId: 21 },
  { id: 107, name: 'Recipes', parentId: 21 },
  { id: 108, name: 'Vegan', parentId: 21 },
  { id: 109, name: 'Astrology', parentId: 28 },
];

// Get hierarchical categories
export const HIERARCHICAL_CATEGORIES = buildCategoryHierarchy(CATEGORIES);
