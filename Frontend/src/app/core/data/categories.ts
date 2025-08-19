
// This file contains the static category data that mirrors the database structure.
// The IDs must match the IDs in your SQL database.

export interface Category {
  id: number;
  name: string;
  parentId?: number | null;
  subcategories?: Category[];
  icon?: string;
  description?: string;
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
  { 
    id: 1, 
    name: 'Fitness & Health',
    icon: 'fas fa-dumbbell',
    description: 'Workout plans, nutrition guides, and wellness content'
  },
  { 
    id: 2, 
    name: 'Self Improvement',
    icon: 'fas fa-user-graduate',
    description: 'Personal development, skills, and life enhancement'
  },
  { 
    id: 3, 
    name: 'Education',
    icon: 'fas fa-graduation-cap',
    description: 'Academic courses, tutorials, and learning materials'
  },
  { 
    id: 4, 
    name: 'Writings & Publishing',
    icon: 'fas fa-pen-fancy',
    description: 'Books, articles, and written content'
  },
  { 
    id: 5, 
    name: 'Business & Money',
    icon: 'fas fa-chart-line',
    description: 'Business strategies, financial advice, and entrepreneurship'
  },
  { 
    id: 6, 
    name: 'Drawing & Painting',
    icon: 'fas fa-palette',
    description: 'Art tutorials, digital painting, and creative guides'
  },
  { 
    id: 7, 
    name: 'Design',
    icon: 'fas fa-paint-brush',
    description: 'Graphic design, UI/UX, and visual content'
  },
  { 
    id: 8, 
    name: '3D',
    icon: 'fas fa-cube',
    description: '3D models, animations, and CGI content'
  },
  { 
    id: 9, 
    name: 'Music & Sound Design',
    icon: 'fas fa-music',
    description: 'Audio tracks, sound effects, and music production'
  },
  { 
    id: 10, 
    name: 'Films',
    icon: 'fas fa-video',
    description: 'Video content, filmmaking, and cinematography'
  },
  { 
    id: 11, 
    name: 'Software Development',
    icon: 'fas fa-code',
    description: 'Programming tutorials, code templates, and tech guides'
  },
  { 
    id: 12, 
    name: 'Gaming',
    icon: 'fas fa-gamepad',
    description: 'Game assets, tutorials, and gaming content'
  },
  { 
    id: 13, 
    name: 'Photography',
    icon: 'fas fa-camera',
    description: 'Photo guides, editing tutorials, and photography tips'
  },
  { 
    id: 14, 
    name: 'eBooks',
    icon: 'fas fa-book-open',
    description: 'Digital books, comics, graphic novels, and fiction literature'
  },
  // Note: Audio and Recorded Music categories have been consolidated into Music & Sound Design


  
  // Subcategories - Fitness & Health (ParentId: 1)
  { id: 18, name: 'Exercise & Workout', parentId: 1 },
  { id: 19, name: 'Running', parentId: 1 },
  { id: 20, name: 'Sports', parentId: 1 },
  { id: 21, name: 'Weight Loss', parentId: 1 },
  { id: 22, name: 'Yoga', parentId: 1 },

  // Subcategories - Self Improvement (ParentId: 2)
  { id: 23, name: 'Cooking', parentId: 2 },
  { id: 24, name: 'Crafts & DYI', parentId: 2 },
  { id: 25, name: 'Dating & Relationships', parentId: 2 },
  { id: 26, name: 'Outdoors', parentId: 2 },
  { id: 27, name: 'Productivity', parentId: 2 },
  { id: 28, name: 'Spirituality', parentId: 2 },
  { id: 29, name: 'Travel', parentId: 2 },
  { id: 30, name: 'Wedding', parentId: 2 },
  { id: 31, name: 'Wellness', parentId: 2 },

  // Subcategories - Education (ParentId: 3)
  { id: 32, name: 'Classroom', parentId: 3 },
  { id: 33, name: 'English', parentId: 3 },
  { id: 34, name: 'Math', parentId: 3 },
  { id: 35, name: 'Science', parentId: 3 },
  { id: 36, name: 'Social Studies', parentId: 3 },
  { id: 37, name: 'Specialties', parentId: 3 },
  { id: 38, name: 'Test Prep', parentId: 3 },

  // Subcategories - Writings & Publishing (ParentId: 4)
  { id: 39, name: 'Courses', parentId: 4 },
  { id: 40, name: 'Resourses', parentId: 4 },

  // Subcategories - Business & Money (ParentId: 5)
  { id: 41, name: 'Accounting', parentId: 5 },
  { id: 42, name: 'Entrepreneurship', parentId: 5 },
  { id: 43, name: 'Gigs & Side Projects', parentId: 5 },
  { id: 44, name: 'Investing', parentId: 5 },
  { id: 45, name: 'Managment & LeaderShip', parentId: 5 },
  { id: 46, name: 'Marketing & Sales', parentId: 5 },
  { id: 47, name: 'Personal Finance', parentId: 5 },
  { id: 48, name: 'Real State', parentId: 5 },

  // Subcategories - Drawing & Painting (ParentId: 6)
  { id: 49, name: 'Artwork Commisions', parentId: 6 },
  { id: 50, name: 'Digital Illustration', parentId: 6 },
  { id: 51, name: 'Tradititional Art', parentId: 6 },

  // Subcategories - Design (ParentId: 7)
  { id: 52, name: 'Architecture', parentId: 7 },
  { id: 53, name: 'Branding Entertainment Design', parentId: 7 },
  { id: 54, name: 'Fashion Design', parentId: 7 },
  { id: 55, name: 'Fonts', parentId: 7 },
  { id: 56, name: 'Graphics', parentId: 7 },
  { id: 57, name: 'Icons', parentId: 7 },
  { id: 58, name: 'Industrial Design', parentId: 7 },
  { id: 59, name: 'Interior Design', parentId: 7 },
  { id: 60, name: 'Print & Packaging', parentId: 7 },
  { id: 61, name: 'UI & Web', parentId: 7 },
  { id: 62, name: 'Wallpapers', parentId: 7 },

  // Subcategories - 3D (ParentId: 8)
  { id: 63, name: '3D Assets', parentId: 8 },
  { id: 64, name: '3D Modeling', parentId: 8 },
  { id: 65, name: 'Animating', parentId: 8 },
  { id: 66, name: 'AR/VR', parentId: 8 },
  { id: 67, name: 'Avatars', parentId: 8 },
  { id: 68, name: 'Character Design', parentId: 8 },
  { id: 69, name: 'Rigging', parentId: 8 },
  { id: 70, name: 'Texture', parentId: 8 },
  { id: 71, name: 'VRChat', parentId: 8 },

  // Subcategories - Music & Sound Design (ParentId: 9)
  { id: 72, name: 'Dance & Theater', parentId: 9 },
  { id: 73, name: 'Instruments', parentId: 9 },
  { id: 74, name: 'Sound Design', parentId: 9 },
  { id: 75, name: 'Vocal', parentId: 9 },

  // Subcategories - Films (ParentId: 10)
  { id: 76, name: 'Comedy', parentId: 10 },
  { id: 77, name: 'Dance', parentId: 10 },
  { id: 78, name: 'Documentary', parentId: 10 },
  { id: 79, name: 'Movie', parentId: 10 },
  { id: 80, name: 'Performance', parentId: 10 },
  { id: 81, name: 'Short Film', parentId: 10 },
  { id: 82, name: 'Sports Events', parentId: 10 },
  { id: 83, name: 'Theatre', parentId: 10 },
  { id: 84, name: 'Video Production & Editing', parentId: 10 },
  { id: 85, name: 'Videography', parentId: 10 },

  // Subcategories - Software Development (ParentId: 11)
  { id: 86, name: 'App Development', parentId: 11 },
  { id: 87, name: 'Hardware', parentId: 11 },
  { id: 88, name: 'Programming', parentId: 11 },
  { id: 89, name: 'Software & Plugins', parentId: 11 },
  { id: 90, name: 'Web Development', parentId: 11 },

  // Subcategories - Gaming (ParentId: 12)
  { id: 91, name: 'Streaming', parentId: 12 },

  // Subcategories - Photography (ParentId: 13)
  { id: 92, name: 'Cosplay', parentId: 13 },
  { id: 93, name: 'Photo Courses', parentId: 13 },
  { id: 94, name: 'Photo Presets & Actions', parentId: 13 },
  { id: 95, name: 'Reference Photos', parentId: 13 },
  { id: 96, name: 'Stock Photos', parentId: 13 },

  // Subcategories - eBooks (ParentId: 14)
  { id: 97, name: 'Fiction & Novels', parentId: 14 },
  { id: 98, name: 'Comics & Graphic Novels', parentId: 14 },
  { id: 99, name: 'Non-Fiction', parentId: 14 },
  { id: 100, name: 'Children\'s Books', parentId: 14 },
  { id: 101, name: 'Educational Books', parentId: 14 },
  { id: 102, name: 'Reference Materials', parentId: 14 },

  // Note: Audio and Recorded Music subcategories have been consolidated into Music & Sound Design
  



  

  // Sub-subcategories - Cooking - Self Improvement (23)
  { id: 185, name: 'Nutrition', parentId: 23 },
  { id: 186, name: 'Recipes', parentId: 23 },
  { id: 187, name: 'Vegan', parentId: 23 },

  // Sub-subcategories - Outdoors - Self Improvement (26)
  { id: 188, name: 'Boating & Fishing', parentId: 26 },
  { id: 189, name: 'Hunting', parentId: 26 },
  { id: 190, name: 'Trekking', parentId: 26 },

  // Sub-subcategories - Spirituality - Self Improvement (28)
  { id: 191, name: 'Astrology', parentId: 28 },
  { id: 192, name: 'Magic', parentId: 28 },
  { id: 193, name: 'Meditation', parentId: 28 },

  // Sub-subcategories - Science - Education
  { id: 110, name: 'Medicine', parentId: 35 },
  { id: 111, name: 'Physics', parentId: 35 },
  { id: 112, name: 'Computer Science', parentId: 38 },

  // Sub-subcategories - Social Studies - Education (36)
  { id: 113, name: 'History', parentId: 36 },
  { id: 114, name: 'Law', parentId: 36 },
  { id: 115, name: 'Politics', parentId: 36 },
  { id: 116, name: 'Economics', parentId: 36 },
  { id: 117, name: 'Psychology', parentId: 36 },
  { id: 118, name: 'Anthropology', parentId: 36 },
  { id: 119, name: 'Sociology', parentId: 36 },

  // Sub-subcategories - Entrepreneurship - Business & Money (42)
  { id: 120, name: 'Courses', parentId: 42 },
  { id: 121, name: 'Podcasts', parentId: 42 },
  { id: 122, name: 'Resources', parentId: 42 },

  // Sub-subcategories - Movie - Films (79)
  { id: 123, name: 'Action & Adventure', parentId: 79 },
  { id: 124, name: 'Animation', parentId: 79 },
  { id: 125, name: 'Anime', parentId: 79 },
  { id: 126, name: 'Black Voices', parentId: 79 },
  { id: 127, name: 'Classics', parentId: 79 },
  { id: 128, name: 'Drama', parentId: 79 },
  { id: 129, name: 'Faith & Spirituality', parentId: 79 },
  { id: 130, name: 'Foreign Language & International', parentId: 79 },
  { id: 131, name: 'Horror', parentId: 79 },
  { id: 132, name: 'Thriller', parentId: 79 },
  { id: 133, name: 'Indian Cinema & Bollywood', parentId: 79 },
  { id: 134, name: 'Indie & Art House', parentId: 79 },
  { id: 135, name: 'Kids & Family', parentId: 79 },
  { id: 136, name: 'Music Videos & Concerts', parentId: 79 },
  { id: 137, name: 'Romance', parentId: 79 },
  { id: 138, name: 'Science Fiction', parentId: 79 },

  // Sub-subcategories - App Development - Software Development (86)
  { id: 139, name: 'React Native', parentId: 86 },
  { id: 140, name: 'Swift', parentId: 86 },

  // Sub-subcategories - Programming - Software Development (88)
  { id: 141, name: 'C#', parentId: 88 },
  { id: 142, name: 'Java', parentId: 88 },
  { id: 143, name: 'Rust', parentId: 88 },
  { id: 144, name: 'GoLang', parentId: 88 },
  { id: 145, name: 'Zig', parentId: 88 },
  { id: 146, name: 'Python', parentId: 88 },
  { id: 147, name: 'JavaScript', parentId: 88 },
  { id: 148, name: 'PHP', parentId: 88 },
  { id: 149, name: 'Ruby', parentId: 88 },

  // Sub-subcategories - Software & Pluggins - Software Development (89)
  { id: 150, name: 'VS Code', parentId: 89 },
  { id: 151, name: 'Wordpress', parentId: 89 },

  // Sub-subcategories - Web Development - Software Development (90)
  { id: 152, name: 'AWS', parentId: 90 },
  { id: 153, name: 'Frontend', parentId: 90 },
  { id: 154, name: 'Backend', parentId: 90 },

  // Note: Recorded Music sub-subcategories have been consolidated into Music & Sound Design




  // Sub - Sub-Subcategories  -  Frontend  -  Web Development - Software Development (153)
  { id: 175, name: 'React JS', parentId: 153 },
  { id: 176, name: 'Next JS', parentId: 153 },
  { id: 177, name: 'Angular', parentId: 153 },

  // Sub - Sub-Subcategories  -  Backend  -  Web Development - Software Development (154)
  { id: 178, name: '.NET', parentId: 154 },
  { id: 179, name: 'Spring Boot', parentId: 154 },
  { id: 180, name: 'Node.Js', parentId: 154 },
  { id: 181, name: 'NestJs', parentId: 154 },
  { id: 182, name: 'Django', parentId: 154 },
  { id: 183, name: 'Flask', parentId: 154 },
  { id: 184, name: 'Laravel', parentId: 154 },


  
];

// Get hierarchical categories
export const HIERARCHICAL_CATEGORIES = buildCategoryHierarchy(CATEGORIES);
