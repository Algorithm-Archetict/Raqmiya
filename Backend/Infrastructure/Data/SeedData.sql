-- =====================================================
-- Raqmiya Database Seed Data Script
-- =====================================================
-- Password for all users: "Password123!"
-- Salt: "randomsalt123"
-- Hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8" (SHA-256 of "Password123!randomsalt123")

-- =====================================================
-- 1. USERS TABLE POPULATION
-- =====================================================

INSERT INTO Users (Email, HashedPassword, Salt, Username, CreatedAt, LastLogin, Role, ProfileDescription, ProfileImageUrl, IsActive) VALUES
-- Creators
('alex.designer@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'AlexDesigner', '2023-01-15 10:30:00', '2024-01-20 14:22:00', 'Creator', 'Professional 3D artist with 8+ years of experience in game development and architectural visualization.', 'https://example.com/profiles/alex.jpg', 1),
('maya.sounds@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'MayaSounds', '2023-02-20 09:15:00', '2024-01-19 16:45:00', 'Creator', 'Audio engineer and composer specializing in game soundtracks and ambient music.', 'https://example.com/profiles/maya.jpg', 1),
('david.coder@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'DavidCoder', '2023-03-10 11:20:00', '2024-01-18 13:30:00', 'Creator', 'Full-stack developer and Unity expert. Creating tools and assets for indie game developers.', 'https://example.com/profiles/david.jpg', 1),
('sarah.artist@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'SarahArtist', '2023-04-05 14:45:00', '2024-01-17 10:15:00', 'Creator', 'Digital illustrator and concept artist. Passionate about creating stunning visual assets.', 'https://example.com/profiles/sarah.jpg', 1),
('mike.animator@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'MikeAnimator', '2023-05-12 08:30:00', '2024-01-16 15:20:00', 'Creator', '3D animator with expertise in character animation and motion graphics.', 'https://example.com/profiles/mike.jpg', 1),
('lisa.ui@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'LisaUI', '2023-06-18 12:00:00', '2024-01-15 11:40:00', 'Creator', 'UI/UX designer focused on creating intuitive and beautiful user interfaces.', 'https://example.com/profiles/lisa.jpg', 1),
('tom.educator@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'TomEducator', '2023-07-22 16:30:00', '2024-01-14 09:25:00', 'Creator', 'Game development instructor with 10+ years of teaching experience.', 'https://example.com/profiles/tom.jpg', 1),
('emma.texture@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'EmmaTexture', '2023-08-30 13:15:00', '2024-01-13 17:50:00', 'Creator', 'Texture artist specializing in PBR materials and environmental textures.', 'https://example.com/profiles/emma.jpg', 1),

-- Regular Users
('john.buyer@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'JohnBuyer', '2023-09-10 10:45:00', '2024-01-12 14:30:00', 'User', 'Indie game developer looking for quality assets.', NULL, 1),
('jane.gamer@email.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'JaneGamer', '2023-10-15 15:20:00', '2024-01-11 12:15:00', 'User', 'Game enthusiast and hobbyist developer.', NULL, 1),

-- Admin
('admin@raqmiya.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'randomsalt123', 'RaqmiyaAdmin', '2023-01-01 00:00:00', '2024-01-20 18:00:00', 'Admin', 'Raqmiya platform administrator.', 'https://example.com/profiles/admin.jpg', 1);

-- =====================================================
-- 2. CATEGORIES TABLE POPULATION
-- =====================================================

INSERT INTO Categories (Name, Description, ParentCategoryId) VALUES
-- Main Categories
('3D Models', 'High-quality 3D models for games, architecture, and visualization', NULL),
('Audio', 'Music, sound effects, and audio assets', NULL),
('Scripts & Tools', 'Code, plugins, and development tools', NULL),
('2D Graphics', 'Sprites, textures, UI elements, and 2D artwork', NULL),
('Animations', '3D animations, motion capture data, and rigged characters', NULL),
('Templates', 'Project templates and starter kits', NULL),

-- 3D Models Subcategories
('Characters', '3D character models and avatars', 1),
('Environments', 'Landscapes, buildings, and environmental assets', 1),
('Props', 'Furniture, weapons, vehicles, and misc objects', 1),
('Architecture', 'Buildings, structures, and architectural elements', 1),

-- Audio Subcategories
('Music', 'Background music, themes, and soundtracks', 2),
('Sound Effects', 'Game sounds, ambient audio, and SFX', 2),
('Voice Acting', 'Character voices and narration', 2),

-- Scripts & Tools Subcategories
('Unity Scripts', 'C# scripts and Unity-specific tools', 3),
('Unreal Engine', 'Blueprints and UE-specific assets', 3),
('Web Development', 'JavaScript, HTML, CSS, and web tools', 3),
('Mobile Development', 'iOS, Android, and mobile-specific tools', 3),

-- 2D Graphics Subcategories
('UI Elements', 'Buttons, icons, and interface components', 4),
('Textures', 'PBR materials, seamless textures, and surfaces', 4),
('Sprites', '2D game sprites and pixel art', 4),
('Illustrations', 'Concept art, backgrounds, and illustrations', 4),

-- Animations Subcategories
('Character Animation', 'Rigged characters and animation sets', 5),
('Motion Graphics', 'UI animations and motion design', 5),

-- Templates Subcategories
('Game Templates', 'Complete game projects and prototypes', 6),
('Web Templates', 'Website templates and themes', 6);

-- =====================================================
-- 3. TAGS TABLE POPULATION
-- =====================================================

INSERT INTO Tags (Name) VALUES
-- General Tags
('Unity'), ('Unreal Engine'), ('Blender'), ('Maya'), ('3ds Max'), ('Photoshop'),
('Low Poly'), ('High Poly'), ('PBR'), ('Stylized'), ('Realistic'), ('Cartoon'),
('Medieval'), ('Modern'), ('Sci-Fi'), ('Fantasy'), ('Horror'), ('Casual'),
('Mobile'), ('VR'), ('AR'), ('Multiplayer'), ('Single Player'),

-- 3D Specific
('Rigged'), ('Animated'), ('Game Ready'), ('Modular'), ('Tileable'),
('Human'), ('Animal'), ('Robot'), ('Vehicle'), ('Weapon'), ('Building'),

-- Audio Specific
('Orchestral'), ('Electronic'), ('Ambient'), ('Rock'), ('Jazz'), ('Classical'),
('Loop'), ('One Shot'), ('Stereo'), ('Mono'), ('44kHz'), ('48kHz'),

-- Programming
('C#'), ('JavaScript'), ('Python'), ('Blueprint'), ('Shader'), ('AI'),
('Networking'), ('Database'), ('API'), ('Framework'),

-- 2D Specific
('Pixel Art'), ('Vector'), ('Hand Drawn'), ('Digital Painting'), ('Icon'),
('Button'), ('Background'), ('Character Sheet'), ('Tileset'),

-- Platform Specific
('Windows'), ('Mac'), ('Linux'), ('iOS'), ('Android'), ('WebGL'),
('PlayStation'), ('Xbox'), ('Nintendo Switch');

-- =====================================================
-- 4. CATEGORY-TAG RELATIONSHIPS
-- =====================================================

INSERT INTO CategoryTags (CategoryId, TagId) VALUES
-- 3D Models (1) tags
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 9), (1, 10), (1, 11), (1, 12), (1, 25), (1, 26), (1, 27),
-- Characters (7) tags
(7, 1), (7, 2), (7, 25), (7, 26), (7, 29), (7, 30), (7, 11), (7, 12),
-- Environments (8) tags
(8, 1), (8, 2), (8, 3), (8, 13), (8, 14), (8, 15), (8, 16), (8, 31),
-- Props (9) tags
(9, 1), (9, 2), (9, 9), (9, 10), (9, 27), (9, 30), (9, 31),
-- Architecture (10) tags
(10, 1), (10, 2), (10, 3), (10, 11), (10, 14), (10, 31),

-- Audio (2) tags
(2, 35), (2, 36), (2, 37), (2, 38), (2, 39), (2, 40), (2, 41), (2, 42), (2, 43), (2, 44), (2, 45), (2, 46),
-- Music (11) tags
(11, 35), (11, 36), (11, 37), (11, 38), (11, 39), (11, 40), (11, 41),
-- Sound Effects (12) tags
(12, 42), (12, 43), (12, 44), (12, 45), (12, 46),
-- Voice Acting (13) tags
(13, 42), (13, 43), (13, 44), (13, 45),

-- Scripts & Tools (3) tags
(3, 1), (3, 2), (3, 47), (3, 48), (3, 49), (3, 50), (3, 51), (3, 52), (3, 53), (3, 54), (3, 55),
-- Unity Scripts (14) tags
(14, 1), (14, 47), (14, 51), (14, 52),
-- Unreal Engine (15) tags
(15, 2), (15, 50), (15, 51), (15, 52),
-- Web Development (16) tags
(16, 48), (16, 53), (16, 54), (16, 55),
-- Mobile Development (17) tags
(17, 19), (17, 47), (17, 48), (17, 53), (17, 54),

-- 2D Graphics (4) tags
(4, 6), (4, 56), (4, 57), (4, 58), (4, 59), (4, 60), (4, 61), (4, 62), (4, 63), (4, 64),
-- UI Elements (18) tags
(18, 60), (18, 61), (18, 57), (18, 58),
-- Textures (19) tags
(19, 9), (19, 28), (19, 11), (19, 12),
-- Sprites (20) tags
(20, 56), (20, 63), (20, 64),
-- Illustrations (21) tags
(21, 57), (21, 58), (21, 59), (21, 62),

-- Animations (5) tags
(5, 1), (5, 2), (5, 3), (5, 25), (5, 26),
-- Character Animation (22) tags
(22, 25), (22, 26), (22, 29),
-- Motion Graphics (23) tags
(23, 1), (23, 2), (23, 6),

-- Templates (6) tags
(6, 1), (6, 2), (6, 18), (6, 19), (6, 22), (6, 23),
-- Game Templates (24) tags
(24, 1), (24, 2), (24, 18), (24, 22), (24, 23),
-- Web Templates (25) tags
(25, 48), (25, 53), (25, 54), (25, 55);

-- =====================================================
-- 5. PRODUCTS TABLE POPULATION
-- =====================================================

INSERT INTO Products (CreatorId, Name, Description, Price, Currency, CoverImageUrl, ThumbnailImageUrl, PublishedAt, Status, IsPublic, Permalink, Features, Compatibility, License, Updates, CategoryId) VALUES

-- Alex Designer's Products (CreatorId: 1)
(1, 'Medieval Castle Pack', 'Complete medieval castle with modular pieces, towers, walls, and interior elements. Perfect for fantasy games and architectural visualization.', 49.99, 'USD', 'https://example.com/covers/medieval-castle.jpg', 'https://example.com/thumbs/medieval-castle.jpg', '2023-12-01 10:00:00', 'published', 1, 'medieval-castle-pack', '["Modular Design", "Low Poly Optimized", "PBR Textures", "Multiple LODs", "Unity Package Included"]', 'Unity, Unreal Engine, Blender', 'Standard License', 'Lifetime Updates', 8),

(1, 'Sci-Fi Character Collection', 'Set of 5 rigged sci-fi characters with multiple animations and customizable materials.', 79.99, 'USD', 'https://example.com/covers/scifi-chars.jpg', 'https://example.com/thumbs/scifi-chars.jpg', '2023-11-15 14:30:00', 'published', 1, 'scifi-character-collection', '["5 Unique Characters", "Fully Rigged", "20+ Animations", "Customizable Materials", "Mobile Optimized"]', 'Unity, Unreal Engine, Maya', 'Standard License', '1 Year Updates', 7),

(1, 'Modern Office Interior', 'Complete modern office environment with furniture, computers, and decorative elements.', 34.99, 'USD', 'https://example.com/covers/office-interior.jpg', 'https://example.com/thumbs/office-interior.jpg', '2023-10-20 09:15:00', 'published', 1, 'modern-office-interior', '["Complete Scene", "High Quality Textures", "Realistic Lighting", "Modular Furniture"]', 'Unity, Unreal Engine, 3ds Max', 'Standard License', 'Lifetime Updates', 8),

-- Maya Sounds' Products (CreatorId: 2)
(2, 'Epic Fantasy Soundtrack', 'Orchestral fantasy music pack with 10 tracks perfect for RPG games and cinematic scenes.', 29.99, 'USD', 'https://example.com/covers/fantasy-music.jpg', 'https://example.com/thumbs/fantasy-music.jpg', '2023-12-10 16:20:00', 'published', 1, 'epic-fantasy-soundtrack', '["10 High-Quality Tracks", "Seamless Loops", "Multiple Formats", "Commercial License"]', 'Unity, Unreal Engine, Any DAW', 'Commercial License', 'No Updates Needed', 11),

(2, 'Ambient Nature Sounds', 'Collection of 50 nature sound effects including forest, water, wind, and animal sounds.', 19.99, 'USD', 'https://example.com/covers/nature-sounds.jpg', 'https://example.com/thumbs/nature-sounds.jpg', '2023-11-25 11:45:00', 'published', 1, 'ambient-nature-sounds', '["50 Sound Effects", "High Quality 48kHz", "Loopable", "Multiple Variations"]', 'Unity, Unreal Engine, Any Audio Software', 'Standard License', 'Lifetime Updates', 12),

(2, 'Retro Game Music Pack', '8-bit style music collection with 15 catchy tracks for indie and retro games.', 24.99, 'USD', 'https://example.com/covers/retro-music.jpg', 'https://example.com/thumbs/retro-music.jpg', '2023-10-30 13:30:00', 'published', 1, 'retro-game-music-pack', '["15 Retro Tracks", "8-bit Style", "Perfect Loops", "Nostalgic Feel"]', 'Unity, Unreal Engine, GameMaker', 'Standard License', '6 Month Updates', 11),

-- David Coder's Products (CreatorId: 3)
(3, 'Unity Inventory System', 'Complete drag-and-drop inventory system with UI, item management, and save/load functionality.', 39.99, 'USD', 'https://example.com/covers/inventory-system.jpg', 'https://example.com/thumbs/inventory-system.jpg', '2023-12-05 12:00:00', 'published', 1, 'unity-inventory-system', '["Drag & Drop Interface", "Save/Load System", "Item Categories", "Customizable UI", "Documentation Included"]', 'Unity 2021.3+', 'Standard License', 'Lifetime Updates', 14),

(3, 'Mobile Game Template', 'Complete endless runner game template with monetization, leaderboards, and social features.', 59.99, 'USD', 'https://example.com/covers/mobile-template.jpg', 'https://example.com/thumbs/mobile-template.jpg', '2023-11-20 15:45:00', 'published', 1, 'mobile-game-template', '["Complete Game", "Monetization Ready", "Leaderboards", "Social Integration", "Easy Customization"]', 'Unity, iOS, Android', 'Commercial License', '1 Year Updates', 24),

(3, 'AI Behavior Tree System', 'Advanced AI system with visual behavior tree editor and pre-built behaviors.', 69.99, 'USD', 'https://example.com/covers/ai-system.jpg', 'https://example.com/thumbs/ai-system.jpg', '2023-10-15 10:30:00', 'published', 1, 'ai-behavior-tree-system', '["Visual Editor", "Pre-built Behaviors", "Extensible Framework", "Performance Optimized"]', 'Unity 2022.1+', 'Standard License', 'Lifetime Updates', 14),

-- Sarah Artist's Products (CreatorId: 4)
(4, 'Fantasy UI Kit', 'Complete fantasy-themed UI kit with buttons, panels, icons, and decorative elements.', 27.99, 'USD', 'https://example.com/covers/fantasy-ui.jpg', 'https://example.com/thumbs/fantasy-ui.jpg', '2023-12-08 14:15:00', 'published', 1, 'fantasy-ui-kit', '["100+ UI Elements", "Vector Graphics", "Multiple Styles", "PSD Files Included"]', 'Unity, Unreal Engine, Photoshop', 'Standard License', '6 Month Updates', 18),

(4, 'Pixel Art Character Pack', 'Collection of 20 animated pixel art characters for 2D games with multiple animation sets.', 22.99, 'USD', 'https://example.com/covers/pixel-chars.jpg', 'https://example.com/thumbs/pixel-chars.jpg', '2023-11-30 09:20:00', 'published', 1, 'pixel-art-character-pack', '["20 Characters", "Multiple Animations", "Sprite Sheets", "High Resolution"]', 'Unity, GameMaker, Construct', 'Standard License', 'Lifetime Updates', 20),

(4, 'Seamless Texture Collection', 'High-quality PBR texture pack with 30 seamless materials for environments and props.', 32.99, 'USD', 'https://example.com/covers/textures.jpg', 'https://example.com/thumbs/textures.jpg', '2023-10-25 16:40:00', 'published', 1, 'seamless-texture-collection', '["30 PBR Materials", "4K Resolution", "Seamless Tiling", "Multiple Formats"]', 'Unity, Unreal Engine, Blender, 3ds Max', 'Standard License', 'Lifetime Updates', 19),

-- Mike Animator's Products (CreatorId: 5)
(5, 'Combat Animation Set', 'Professional combat animations for humanoid characters including attacks, blocks, and combos.', 44.99, 'USD', 'https://example.com/covers/combat-anims.jpg', 'https://example.com/thumbs/combat-anims.jpg', '2023-12-12 11:30:00', 'published', 1, 'combat-animation-set', '["50+ Animations", "Root Motion", "Combo System", "Weapon Variants"]', 'Unity, Unreal Engine, Maya', 'Standard License', '1 Year Updates', 22),

(5, 'Creature Animation Pack', 'Animation set for quadruped creatures including walk, run, attack, and idle cycles.', 38.99, 'USD', 'https://example.com/covers/creature-anims.jpg', 'https://example.com/thumbs/creature-anims.jpg', '2023-11-18 13:50:00', 'published', 1, 'creature-animation-pack', '["Quadruped Animations", "Natural Movement", "Multiple Speeds", "Blend Trees Ready"]', 'Unity, Unreal Engine, Maya', 'Standard License', 'Lifetime Updates', 22),

-- Lisa UI's Products (CreatorId: 6)
(6, 'Modern Mobile UI Kit', 'Clean and modern mobile UI kit with dark and light themes, perfect for apps and games.', 31.99, 'USD', 'https://example.com/covers/mobile-ui.jpg', 'https://example.com/thumbs/mobile-ui.jpg', '2023-12-15 10:45:00', 'published', 1, 'modern-mobile-ui-kit', '["Dark & Light Themes", "200+ Elements", "Figma Files", "Unity Package"]', 'Unity, Figma, Sketch', 'Standard License', '6 Month Updates', 18),

(6, 'Game HUD Collection', 'Comprehensive game HUD elements including health bars, minimaps, inventory slots, and more.', 25.99, 'USD', 'https://example.com/covers/game-hud.jpg', 'https://example.com/thumbs/game-hud.jpg', '2023-11-12 15:25:00', 'published', 1, 'game-hud-collection', '["Modular Design", "Multiple Styles", "Animated Elements", "Easy Integration"]', 'Unity, Unreal Engine', 'Standard License', 'Lifetime Updates', 18),

-- Tom Educator's Products (CreatorId: 7)
(7, 'Complete Unity Course', 'Comprehensive Unity game development course from beginner to advanced with 50+ hours of content.', 89.99, 'USD', 'https://example.com/covers/unity-course.jpg', 'https://example.com/thumbs/unity-course.jpg', '2023-12-20 08:00:00', 'published', 1, 'complete-unity-course', '["50+ Hours Content", "Project Files", "Lifetime Access", "Certificate", "Community Support"]', 'Unity 2022.3 LTS', 'Educational License', 'Regular Updates', 24),

(7, 'Game Design Fundamentals', 'Essential game design principles and methodologies with practical examples and exercises.', 49.99, 'USD', 'https://example.com/covers/game-design.jpg', 'https://example.com/thumbs/game-design.jpg', '2023-11-08 12:30:00', 'published', 1, 'game-design-fundamentals', '["Theory & Practice", "Case Studies", "Design Documents", "Templates Included"]', 'Any Game Engine', 'Educational License', '6 Month Updates', 24),

-- Emma Texture's Products (CreatorId: 8)
(8, 'Architectural Materials Pack', 'Professional architectural materials including concrete, wood, metal, and stone textures.', 42.99, 'USD', 'https://example.com/covers/arch-materials.jpg', 'https://example.com/thumbs/arch-materials.jpg', '2023-12-18 14:20:00', 'published', 1, 'architectural-materials-pack', '["25 PBR Materials", "8K Resolution", "Photorealistic", "Substance Files"]', 'Unity, Unreal Engine, Blender, Substance', 'Commercial License', 'Lifetime Updates', 19),

(8, 'Stylized Environment Textures', 'Hand-painted stylized textures perfect for cartoon and fantasy environments.', 28.99, 'USD', 'https://example.com/covers/stylized-tex.jpg', 'https://example.com/thumbs/stylized-tex.jpg', '2023-11-22 16:10:00', 'published', 1, 'stylized-environment-textures', '["Hand-Painted Style", "Tileable", "Optimized for Games", "Multiple Variations"]', 'Unity, Unreal Engine, Any 3D Software', 'Standard License', '1 Year Updates', 19);

-- =====================================================
-- 6. PRODUCT-TAG RELATIONSHIPS
-- =====================================================

INSERT INTO ProductTags (ProductId, TagId) VALUES
-- Medieval Castle Pack (Product 1)
(1, 1), (1, 2), (1, 3), (1, 9), (1, 13), (1, 16), (1, 27), (1, 31),

-- Sci-Fi Character Collection (Product 2)
(2, 1), (2, 2), (2, 4), (2, 15), (2, 25), (2, 26), (2, 29),

-- Modern Office Interior (Product 3)
(3, 1), (3, 2), (3, 5), (3, 11), (3, 14), (3, 27), (3, 31),

-- Epic Fantasy Soundtrack (Product 4)
(4, 1), (4, 2), (4, 16), (4, 35), (4, 41),

-- Ambient Nature Sounds (Product 5)
(5, 1), (5, 2), (5, 37), (5, 42), (5, 46),

-- Retro Game Music Pack (Product 6)
(6, 1), (6, 18), (6, 36), (6, 41),

-- Unity Inventory System (Product 7)
(7, 1), (7, 47), (7, 51), (7, 55),

-- Mobile Game Template (Product 8)
(8, 1), (8, 19), (8, 47), (8, 65), (8, 66),

-- AI Behavior Tree System (Product 9)
(9, 1), (9, 47), (9, 51), (9, 52),

-- Fantasy UI Kit (Product 10)
(10, 1), (10, 2), (10, 6), (10, 16), (10, 57), (10, 60), (10, 61),

-- Pixel Art Character Pack (Product 11)
(11, 1), (11, 56), (11, 63), (11, 64),

-- Seamless Texture Collection (Product 12)
(12, 1), (12, 2), (12, 3), (12, 5), (12, 9), (12, 28),

-- Combat Animation Set (Product 13)
(13, 1), (13, 2), (13, 4), (13, 25), (13, 26),

-- Creature Animation Pack (Product 14)
(14, 1), (14, 2), (14, 4), (14, 25), (14, 26), (14, 30),

-- Modern Mobile UI Kit (Product 15)
(15, 1), (15, 19), (15, 57), (15, 60), (15, 61),

-- Game HUD Collection (Product 16)
(16, 1), (16, 2), (16, 60), (16, 61),

-- Complete Unity Course (Product 17)
(17, 1), (17, 47), (17, 18), (17, 22),

-- Game Design Fundamentals (Product 18)
(18, 18), (18, 22), (18, 23),

-- Architectural Materials Pack (Product 19)
(19, 1), (19, 2), (19, 3), (19, 9), (19, 11), (19, 28),

-- Stylized Environment Textures (Product 20)
(20, 1), (20, 2), (20, 12), (20, 16), (20, 28);

PRINT 'Database seeded successfully!';
PRINT 'Login credentials for all users:';
PRINT 'Password: Password123!';
PRINT 'All users can login with their email and the above password.';