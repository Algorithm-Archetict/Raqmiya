-- SQL Script to Insert Sample Products

-- Creator IDs to use: 2, 4, 6, 9, 10, 11, 12, 13

BEGIN TRANSACTION;

-- Products for Creator 2 (Self Improvement & Fitness)
INSERT INTO [RaqmiyaDB].[dbo].[Products] 
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(2, 'Ultimate Productivity Guide', 'A comprehensive guide to boost your productivity and achieve your goals. Includes templates and worksheets.', 29.99, 'USD', 'https://example.com/prod_guide_cover.jpg', 'https://example.com/prod_guide_thumb.jpg', 'https://example.com/prod_guide_preview.mp4', GETDATE(), 'Published', NULL, 1, 'ultimate-productivity-guide', '["Goal setting templates", "Time management techniques", "Weekly planner"]', 'All devices', 'Standard', 'Lifetime updates', 26),
(2, '30-Day Fitness Challenge', 'Get in the best shape of your life with this 30-day fitness program. Daily workout videos and meal plan included.', 49.99, 'USD', 'https://example.com/fitness_challenge_cover.jpg', 'https://example.com/fitness_challenge_thumb.jpg', NULL, GETDATE(), 'Published', NULL, 1, '30-day-fitness-challenge', '["Daily workout videos", "Nutrition guide", "Community access"]', 'All devices', 'Standard', 'None', 16);

-- Products for Creator 4 (Business & Money)
INSERT INTO [RaqmiyaDB].[dbo].[Products]
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(4, 'Digital Marketing Masterclass', 'Learn the secrets of digital marketing from an industry expert. Covers SEO, social media, and email marketing.', 99.99, 'USD', 'https://example.com/marketing_masterclass_cover.jpg', 'https://example.com/marketing_masterclass_thumb.jpg', 'https://example.com/marketing_masterclass_preview.mp4', GETDATE(), 'Published', NULL, 1, 'digital-marketing-masterclass', '["10+ hours of video content", "Downloadable resources", "Certificate of completion"]', 'All devices', 'Premium', 'Quarterly updates', 39),
(4, 'Startup Financial Model', 'A ready-to-use financial model for your startup. Perfect for fundraising and business planning.', 79.00, 'USD', 'https://example.com/financial_model_cover.jpg', 'https://example.com/financial_model_thumb.jpg', NULL, GETDATE(), 'Published', NULL, 1, 'startup-financial-model', '["Excel and Google Sheets formats", "5-year forecast", "Investor-ready"]', 'Microsoft Excel, Google Sheets', 'Standard', 'Annual updates', 35);

-- Products for Creator 6 (3D)
INSERT INTO [RaqmiyaDB].[dbo].[Products]
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(6, 'Sci-Fi Asset Pack', 'A collection of 50+ high-quality 3D models for your sci-fi game or animation. Includes spaceships, props, and environments.', 150.00, 'USD', 'https://example.com/scifi_assets_cover.jpg', 'https://example.com/scifi_assets_thumb.jpg', 'https://example.com/scifi_assets_preview.mp4', GETDATE(), 'Published', NULL, 1, 'sci-fi-asset-pack', '["Game-ready assets", "4K textures", "FBX and OBJ formats"]', 'Unreal Engine, Unity', 'Extended', 'Lifetime updates', 45),
(6, 'Character Rig for Blender', 'A professional-grade character rig for Blender. Fully customizable and ready for animation.', 60.00, 'USD', 'https://example.com/character_rig_cover.jpg', 'https://example.com/character_rig_thumb.jpg', NULL, GETDATE(), 'Published', NULL, 1, 'character-rig-for-blender', '["IK/FK controls", "Facial rig", "Includes sample animations"]', 'Blender 3.0+', 'Standard', 'As needed', 51);

-- Products for Creator 9 (Software Development)
INSERT INTO [RaqmiyaDB].[dbo].[Products]
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(9, 'React Admin Dashboard Template', 'A modern and responsive admin dashboard template built with React and Material-UI. Save hundreds of hours of development time.', 49.00, 'USD', 'https://example.com/react_dashboard_cover.jpg', 'https://example.com/react_dashboard_thumb.jpg', 'https://example.com/react_dashboard_preview.mp4', GETDATE(), 'Published', NULL, 1, 'react-admin-dashboard-template', '["Light and dark modes", "Fully documented code", "Free updates"]', 'React 18+', 'Standard', 'Lifetime updates', 72),
(9, 'Python Web Scraping Course', 'Learn how to scrape websites and extract data using Python. Covers Beautiful Soup, Scrapy, and Selenium.', 75.50, 'USD', 'https://example.com/python_scraping_cover.jpg', 'https://example.com/python_scraping_thumb.jpg', NULL, GETDATE(), 'Published', NULL, 1, 'python-web-scraping-course', '["Hands-on projects", "Code examples", "Certificate of completion"]', 'Python 3.8+', 'Premium', 'None', 70);

-- Products for Creator 10 (Gaming)
INSERT INTO [RaqmiyaDB].[dbo].[Products]
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(10, 'Animated Stream Overlays', 'A pack of professional animated overlays for your Twitch or YouTube stream. Includes scenes, alerts, and widgets.', 35.00, 'USD', 'https://example.com/stream_overlays_cover.jpg', 'https://example.com/stream_overlays_thumb.jpg', 'https://example.com/stream_overlays_preview.mp4', GETDATE(), 'Published', NULL, 1, 'animated-stream-overlays', '["Compatible with OBS and Streamlabs", "Easy to set up", "Customizable colors"]', 'OBS, Streamlabs', 'Standard', 'None', 73);

-- Products for Creator 11 (Photography)
INSERT INTO [RaqmiyaDB].[dbo].[Products]
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(11, 'Moody Lightroom Presets', 'A collection of 10 professional Lightroom presets for creating a moody and atmospheric look in your photos.', 19.99, 'USD', 'https://example.com/moody_presets_cover.jpg', 'https://example.com/moody_presets_thumb.jpg', NULL, GETDATE(), 'Published', NULL, 1, 'moody-lightroom-presets', '["Mobile and desktop compatible", "One-click edits", "Installation guide included"]', 'Adobe Lightroom', 'Standard', 'None', 76),
(11, 'Urban Photography Course', 'Master the art of urban photography. Learn about composition, lighting, and editing techniques for stunning cityscapes.', 89.99, 'USD', 'https://example.com/urban_photo_course_cover.jpg', 'https://example.com/urban_photo_course_thumb.jpg', 'https://example.com/urban_photo_course_preview.mp4', GETDATE(), 'Published', NULL, 1, 'urban-photography-course', '["5+ hours of video lessons", "Behind-the-scenes shoots", "Private community access"]', 'Any DSLR or mirrorless camera', 'Premium', 'Annual updates', 75);

-- Products for Creator 12 (Comics & Graphic Novels)
INSERT INTO [RaqmiyaDB].[dbo].[Products]
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(12, 'The Last Stand: Issue #1', 'The first issue of an epic post-apocalyptic comic series. Follow the journey of a lone survivor in a world overrun by mutants.', 4.99, 'USD', 'https://example.com/comic_issue1_cover.jpg', 'https://example.com/comic_issue1_thumb.jpg', NULL, GETDATE(), 'Published', NULL, 1, 'the-last-stand-issue-1', '["32 pages", "Full color", "Digital PDF format"]', 'Any PDF reader', 'Standard', 'None', 12);

-- Products for Creator 13 (Fiction Books)
INSERT INTO [RaqmiyaDB].[dbo].Products
([CreatorId], [Name], [Description], [Price], [Currency], [CoverImageUrl], [ThumbnailImageUrl], [PreviewVideoUrl], [PublishedAt], [Status], [RejectionReason], [IsPublic], [Permalink], [Features], [Compatibility], [License], [Updates], [CategoryId])
VALUES
(13, 'Chronicles of Aethelgard', 'A young adult fantasy novel about a hidden world of magic, dragons, and ancient prophecies. First book in a planned trilogy.', 14.99, 'USD', 'https://example.com/fantasy_novel_cover.jpg', 'https://example.com/fantasy_novel_thumb.jpg', NULL, GETDATE(), 'Published', NULL, 1, 'chronicles-of-aethelgard', '["EPUB, MOBI, and PDF formats", "400 pages", "Professionally edited"]', 'Kindle, Apple Books, etc.', 'Standard', 'None', 83);

COMMIT;