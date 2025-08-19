-- Add some test products to Self Improvement subcategories for testing
-- Run this script to add test data for Self Improvement categories

-- Self Improvement parent category ID: 2
-- Subcategories: 21-31 (Cooking, Crafts & DIY, Dating & Relationships, etc.)

INSERT INTO [dbo].[Products] ([Name], [Description], [Price], [Currency], [CreatorId], [IsPublic], [Permalink], [Status], [PublishedAt], [CategoryId], [CreatedAt], [UpdatedAt])
VALUES
-- Cooking (CategoryId: 21)
('Master Chef Cookbook', 'Learn to cook like a professional chef with 200+ recipes and techniques.', 39.99, 'USD', 5, 1, 'master-chef-cookbook', 'published', GETUTCDATE(), 21, GETUTCDATE(), GETUTCDATE()),
('Healthy Meal Prep Guide', 'Complete guide to meal prepping for busy professionals.', 24.99, 'USD', 5, 1, 'healthy-meal-prep-guide', 'published', GETUTCDATE(), 21, GETUTCDATE(), GETUTCDATE()),

-- Crafts & DIY (CategoryId: 22)
('DIY Home Decoration Kit', 'Transform your home with these easy DIY decoration projects.', 29.99, 'USD', 2, 1, 'diy-home-decoration-kit', 'published', GETUTCDATE(), 22, GETUTCDATE(), GETUTCDATE()),

-- Dating & Relationships (CategoryId: 23)
('Modern Dating Guide', 'Navigate the world of modern dating with confidence and authenticity.', 19.99, 'USD', 4, 1, 'modern-dating-guide', 'published', GETUTCDATE(), 23, GETUTCDATE(), GETUTCDATE()),

-- Philosophy (CategoryId: 25)
('Introduction to Stoicism', 'Learn the principles of Stoic philosophy for daily life.', 34.99, 'USD', 4, 1, 'introduction-to-stoicism', 'published', GETUTCDATE(), 25, GETUTCDATE(), GETUTCDATE()),

-- Productivity (CategoryId: 26)
('Productivity Masterclass', 'Master time management and productivity techniques.', 49.99, 'USD', 3, 1, 'productivity-masterclass', 'published', GETUTCDATE(), 26, GETUTCDATE(), GETUTCDATE()),

-- Psychology (CategoryId: 27)
('Understanding Human Behavior', 'Comprehensive guide to psychology and human behavior.', 59.99, 'USD', 4, 1, 'understanding-human-behavior', 'published', GETUTCDATE(), 27, GETUTCDATE(), GETUTCDATE()),

-- Travel (CategoryId: 29)
('Solo Travel Survival Guide', 'Everything you need to know about traveling alone safely.', 27.99, 'USD', 5, 1, 'solo-travel-survival-guide', 'published', GETUTCDATE(), 29, GETUTCDATE(), GETUTCDATE()),

-- Wellness (CategoryId: 31)
('Mindfulness and Meditation', 'Complete course on mindfulness and meditation practices.', 44.99, 'USD', 5, 1, 'mindfulness-and-meditation', 'published', GETUTCDATE(), 31, GETUTCDATE(), GETUTCDATE());

PRINT 'Self Improvement test products added successfully.';
