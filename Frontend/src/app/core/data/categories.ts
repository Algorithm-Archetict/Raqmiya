
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
  { id: 3, name: 'Education' },
  { id: 4, name: 'Writings & Publishing' },
  { id: 5, name: 'Business & Money' },
  { id: 6, name: 'Drawing & Painting' },
  { id: 7, name: 'Design' },
  { id: 8, name: '3D' },
  { id: 9, name: 'Music & Sound Design' },
  { id: 10, name: 'Films' },
  { id: 11, name: 'Software Development' },
  { id: 12, name: 'Gaming' },
  { id: 13, name: 'Photography' },
  { id: 14, name: 'Comics & Graphic Novels' },
  { id: 15, name: 'Fiction Books' },
  { id: 16, name: 'Audio' },
  { id: 17, name: 'Recorded Music' },


  
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
  //{ id: 26, name: 'Philosophy', parentId: 2 },
  { id: 27, name: 'Productivity', parentId: 2 },
  //{ id: 28, name: 'Psychology', parentId: 2 },
  { id: 28, name: 'Spirituality', parentId: 2 },
  { id: 29, name: 'Travel', parentId: 2 },
  { id: 30, name: 'Wedding', parentId: 2 },
  { id: 31, name: 'Wellness', parentId: 2 },

  // Subcategories - Education (ParentId: 3)
  { id: 32, name: 'Classroom', parentId: 3 },
  { id: 33, name: 'English', parentId: 3 },
  { id: 34, name: 'History', parentId: 3 },
  { id: 35, name: 'Math', parentId: 3 },
  { id: 36, name: 'Science', parentId: 3 },
  { id: 37, name: 'Social Studies', parentId: 3 },
  { id: 38, name: 'Specialties', parentId: 3 },
  { id: 39, name: 'Test Prep', parentId: 3 },

  // Subcategories - Writings & Publishing (ParentId: 4)
  { id: 40, name: 'Courses', parentId: 4 },
  { id: 41, name: 'Resourses', parentId: 4 },

  // Subcategories - Business & Money (ParentId: 5)
  { id: 42, name: 'Accounting', parentId: 5 },
  { id: 43, name: 'Entrepreneurship', parentId: 5 },
  { id: 44, name: 'Gigs & Side Projects', parentId: 5 },
  { id: 45, name: 'Investing', parentId: 5 },
  { id: 46, name: 'Managment & LeaderShip', parentId: 5 },
  { id: 47, name: 'Marketing & Sales', parentId: 5 },
  { id: 48, name: 'Personal Finance', parentId: 5 },
  { id: 49, name: 'Real State', parentId: 5 },

  // Subcategories - Drawing & Painting (ParentId: 6)
  { id: 50, name: 'Artwork Commisions', parentId: 6 },
  { id: 51, name: 'Digital Illustration', parentId: 6 },
  { id: 52, name: 'Tradititional Art', parentId: 6 },

  // Subcategories - Design (ParentId: 7)
  { id: 53, name: 'Architecture', parentId: 7 },
  { id: 54, name: 'Branding Entertainment Design', parentId: 7 },
  { id: 55, name: 'Fashion Design', parentId: 7 },
  { id: 56, name: 'Fonts', parentId: 7 },
  { id: 57, name: 'Graphics', parentId: 7 },
  { id: 58, name: 'Icons', parentId: 7 },
  { id: 59, name: 'Industrial Design', parentId: 7 },
  { id: 60, name: 'Interior Design', parentId: 7 },
  { id: 61, name: 'Print & Packaging', parentId: 7 },
  { id: 62, name: 'UI & Web', parentId: 7 },
  { id: 63, name: 'Wallpapers', parentId: 7 },

  // Subcategories - 3D (ParentId: 8)
  { id: 64, name: '3D Assets', parentId: 8 },
  { id: 65, name: '3D Modeling', parentId: 8 },
  { id: 66, name: 'Animating', parentId: 8 },
  { id: 67, name: 'AR/VR', parentId: 8 },
  { id: 68, name: 'Avatars', parentId: 8 },
  { id: 69, name: 'Character Design', parentId: 8 },
  { id: 70, name: 'Rigging', parentId: 8 },
  { id: 71, name: 'Texture', parentId: 8 },
  { id: 72, name: 'VRChat', parentId: 8 },

  // Subcategories - Music & Sound Design (ParentId: 9)
  { id: 73, name: 'Dance & Theater', parentId: 9 },
  { id: 74, name: 'Instruments', parentId: 9 },
  { id: 75, name: 'Sound Design', parentId: 9 },
  { id: 76, name: 'Vocal', parentId: 9 },

  // Subcategories - Films (ParentId: 10)
  { id: 77, name: 'Comedy', parentId: 10 },
  { id: 78, name: 'Dance', parentId: 10 },
  { id: 79, name: 'Documentary', parentId: 10 },
  { id: 80, name: 'Movie', parentId: 10 },
  { id: 81, name: 'Performance', parentId: 10 },
  { id: 82, name: 'Short Film', parentId: 10 },
  { id: 83, name: 'Sports Events', parentId: 10 },
  { id: 84, name: 'Theatre', parentId: 10 },
  { id: 85, name: 'Video Production & Editing', parentId: 10 },
  { id: 86, name: 'Videography', parentId: 10 },

  // Subcategories - Software Development (ParentId: 11)
  { id: 87, name: 'App Development', parentId: 11 },
  { id: 88, name: 'Hardware', parentId: 11 },
  { id: 89, name: 'Programming', parentId: 11 },
  { id: 90, name: 'Software & Plugins', parentId: 11 },
  { id: 91, name: 'Web Development', parentId: 11 },

  // Subcategories - Gaming (ParentId: 12)
  { id: 92, name: 'Streaming', parentId: 12 },

  // Subcategories - Photography (ParentId: 13)
  { id: 93, name: 'Cosplay', parentId: 13 },
  { id: 94, name: 'Photo Courses', parentId: 13 },
  { id: 95, name: 'Photo Presets & Actions', parentId: 13 },
  { id: 96, name: 'Reference Photos', parentId: 13 },
  { id: 97, name: 'Stock Photos', parentId: 13 },

  // Subcategories - Comics & Graphic Novels (ParentId: 14)

  // Subcategories - Fiction Books (ParentId: 15)
  { id: 98, name: 'Children\'s Books', parentId: 15 },
  { id: 99, name: 'Fantasy', parentId: 15 },
  { id: 100, name: 'Mystery', parentId: 15 },
  { id: 101, name: 'Romance', parentId: 15 },
  { id: 102, name: 'Science Fiction & Young Adult', parentId: 15 },

  // Subcategories - Audio (ParentId: 16)
  { id: 103, name: 'ASMR', parentId: 16 },
  { id: 104, name: 'Healing', parentId: 16 },
  { id: 105, name: 'Hypnosis', parentId: 16 },
  { id: 106, name: 'Sleep & Meditation', parentId: 16 },
  { id: 107, name: 'Subliminal Messages', parentId: 16 },
  { id: 108, name: 'Voiceover', parentId: 16 },

  // Subcategories - Recorded Music (ParentId: 17)
  { id: 109, name: 'Albums', parentId: 17 },
  { id: 110, name: 'Singles', parentId: 17 },
  



  

  // Sub-subcategories - Cooking - Self Improvement (23)
  { id: 111, name: 'Nutrition', parentId: 23 },
  { id: 112, name: 'Recipes', parentId: 23 },
  { id: 113, name: 'Vegan', parentId: 23 },

  // Sub-subcategories - Outdoors - Self Improvement (26)
  { id: 114, name: 'Boating & Fishing', parentId: 26 },
  { id: 115, name: 'Hunting', parentId: 26 },
  { id: 116, name: 'Trekking', parentId: 26 },

  // Sub-subcategories - Spirituality - Self Improvement (28)
  { id: 117, name: 'Astrology', parentId: 28 },
  { id: 118, name: 'Magic', parentId: 28 },
  { id: 119, name: 'Meditation', parentId: 28 },

  // Sub-subcategories - Science - Education
  { id: 120, name: 'Medicine', parentId: 36 },
  { id: 121, name: 'Physics', parentId: 36 },
  { id: 122, name: 'Computer Science', parentId: 39 },

  // Sub-subcategories - Social Studies - Education (37)
  { id: 123, name: 'History', parentId: 37 },
  { id: 124, name: 'Law', parentId: 37 },
  { id: 125, name: 'Politics', parentId: 37 },
  { id: 126, name: 'Economics', parentId: 37 },
  { id: 127, name: 'Psychology', parentId: 37 },
  { id: 128, name: 'Anthropology', parentId: 37 },
  { id: 129, name: 'Sociology', parentId: 37 },

  // Sub-subcategories - Entrepreneurship - Business & Money (43)
  { id: 130, name: 'Courses', parentId: 43 },
  { id: 131, name: 'Podcasts', parentId: 43 },
  { id: 131, name: 'Resourses', parentId: 43 },

  // Sub-subcategories - Movie - Films (80)
  { id: 132, name: 'Action & Adventure', parentId: 80 },
  { id: 133, name: 'Animation', parentId: 80 },
  { id: 134, name: 'Anime', parentId: 80 },
  { id: 135, name: 'Black Voices', parentId: 80 },
  { id: 136, name: 'Classics', parentId: 80 },
  { id: 137, name: 'Drama', parentId: 80 },
  { id: 138, name: 'Faith & Spirituality', parentId: 80 },
  { id: 139, name: 'Foreign Language & International', parentId: 80 },
  { id: 140, name: 'Horror', parentId: 80 },
  { id: 141, name: 'Indian Cinema & Bollywood', parentId: 80 },
  { id: 143, name: 'Indie & Art House', parentId: 80 },
  { id: 144, name: 'Kids & Family', parentId: 80 },
  { id: 145, name: 'Music Videos & Concerts', parentId: 80 },
  { id: 146, name: 'Romance', parentId: 80 },
  { id: 147, name: 'Science Fiction', parentId: 80 },

  // Sub-subcategories - App Development - Software Development (87)
  { id: 148, name: 'React Native', parentId: 87 },
  { id: 149, name: 'Swift', parentId: 87 },

  // Sub-subcategories - Programming - Software Development (89)
  { id: 150, name: 'C#', parentId: 89 },
  { id: 151, name: 'Java', parentId: 89 },
  { id: 152, name: 'Rust', parentId: 89 },
  { id: 153, name: 'GoLang', parentId: 89 },
  { id: 154, name: 'Zig', parentId: 89 },
  { id: 155, name: 'Python', parentId: 89 },
  { id: 156, name: 'JavaScript', parentId: 89 },
  { id: 157, name: 'PHP', parentId: 89 },
  { id: 158, name: 'Ruby', parentId: 89 },

  // Sub-subcategories - Software & Pluggins - Software Development (90)
  { id: 159, name: 'VS Code', parentId: 90 },
  { id: 160, name: 'Wordpress', parentId: 90 },

  // Sub-subcategories - Web Development - Software Development (91)
  { id: 161, name: 'AWS', parentId: 91 },
  { id: 162, name: 'Frontend', parentId: 91 },
  { id: 163, name: 'Backend', parentId: 91 },

  // Sub-Subcategories  Singles - Recorded Music (110)
  { id: 164, name: 'Children Music', parentId: 110 },
  { id: 165, name: 'Christian', parentId: 110 },
  { id: 166, name: 'Classic Rock', parentId: 110 },
  { id: 167, name: 'Classical', parentId: 110 },
  { id: 168, name: 'Country', parentId: 110 },
  { id: 169, name: 'Dance & Electronic', parentId: 110 },
  { id: 170, name: 'Folk', parentId: 110 },
  { id: 171, name: 'Gospel', parentId: 110 },
  { id: 172, name: 'Hard Rock & Metal', parentId: 110 },
  { id: 173, name: 'Holiday Music', parentId: 110 },
  { id: 174, name: 'Jazz', parentId: 110 },
  { id: 175, name: 'Latin Music', parentId: 110 },
  { id: 176, name: 'New Age', parentId: 110 },
  { id: 177, name: 'Opera & Vocal', parentId: 110 },
  { id: 178, name: 'Pop', parentId: 110 },
  { id: 179, name: 'Rap & Hip-Hop', parentId: 110 },
  { id: 180, name: 'R&B', parentId: 110 },
  { id: 181, name: 'Rock', parentId: 110 },
  { id: 182, name: 'Soundtracks', parentId: 110 },
  { id: 183, name: 'World Music', parentId: 110 },




  // Sub - Sub-Subcategories  -  Frontend  -  Web Development - Software Development (162)
  { id: 184, name: 'React JS', parentId: 162 },
  { id: 185, name: 'Next JS', parentId: 162 },
  { id: 186, name: 'Angular', parentId: 162 },

  // Sub - Sub-Subcategories  -  Backend  -  Web Development - Software Development (163)
  { id: 187, name: '.NET', parentId: 163 },
  { id: 188, name: 'Spring Boot', parentId: 163 },
  { id: 189, name: 'Node.Js', parentId: 163 },
  { id: 190, name: 'NestJs', parentId: 163 },
  { id: 191, name: 'Django', parentId: 163 },
  { id: 192, name: 'Laravel', parentId: 163 },
  { id: 193, name: 'Spring Boot', parentId: 163 },


  
];

// Get hierarchical categories
export const HIERARCHICAL_CATEGORIES = buildCategoryHierarchy(CATEGORIES);
