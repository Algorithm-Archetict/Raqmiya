using Microsoft.EntityFrameworkCore;
using Raqmiya.Infrastructure;
using Infrastructure.Data.Entities;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace Raqmiya.Infrastructure
{
    public class RaqmiyaDbContext : DbContext
    {
        public RaqmiyaDbContext(DbContextOptions<RaqmiyaDbContext> options) : base(options) { }

        // DbSets for your entities
        public DbSet<Product> Products { get; set; } = default!;
        public DbSet<User> Users { get; set; } = default!;
        public DbSet<Category> Categories { get; set; } = default!;
        public DbSet<Tag> Tags { get; set; } = default!;
        public DbSet<Review> Reviews { get; set; } = default!;
        public DbSet<WishlistItem> WishlistItems { get; set; } = default!;
        public DbSet<PaymentMethodBalance> PaymentMethodBalances { get; set; }
        public DbSet<ProductView> ProductViews { get; set; } = default!;
        
        public DbSet<ProductTag> ProductTags { get; set; } = default!;
        public DbSet<AddedFile> Files { get; set; } = default!; // Renamed if conflict with System.IO.File
        public DbSet<Variant> Variants { get; set; } = default!;
        public DbSet<OfferCode> OfferCodes { get; set; } = default!;
        public DbSet<Order> Orders { get; set; } = default!;
        public DbSet<OrderItem> OrderItems { get; set; } = default!;
        public DbSet<PlatformCommission> PlatformCommissions { get; set; } = default!;


        //i added
        public DbSet<License> Licenses { get; set; } = null!;
        public DbSet<CreatorSubscription> CreatorSubscriptions { get; set; } = null!;
        public DbSet<Post> Posts { get; set; } = null!;
        // public DbSet<ProductCategory> ProductCategories { get; set; } = null!;
        public DbSet<CategoryTag> CategoryTags { get; set; } = null!;
        public DbSet<ModerationLog> ModerationLogs { get; set; } = null!;
        
        // Messaging
        public DbSet<Conversation> Conversations { get; set; } = null!;
        public DbSet<Message> Messages { get; set; } = null!;
        public DbSet<MessageRequest> MessageRequests { get; set; } = null!;
        public DbSet<ServiceRequest> ServiceRequests { get; set; } = null!;
        public DbSet<Delivery> Deliveries { get; set; } = null!;
        public DbSet<ServiceRequestDeadlineChange> ServiceRequestDeadlineChanges { get; set; } = null!;
        
        // Personalization & Analytics Entities
        public DbSet<UserPreference> UserPreferences { get; set; } = null!;
        public DbSet<UserInteraction> UserInteractions { get; set; } = null!;
        public DbSet<UserProfile> UserProfiles { get; set; } = null!;
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
        public DbSet<EmailVerificationToken> EmailVerificationTokens { get; set; } = null!;
        public DbSet<AccountDeletionToken> AccountDeletionTokens { get; set; } = null!;
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<PlatformCommission>(entity =>
            {
                entity.HasIndex(e => new { e.OrderId, e.OrderItemId });
            });

            // Configure composite primary keys for join tables
            

            modelBuilder.Entity<ProductTag>()
                .HasKey(pt => new { pt.ProductId, pt.TagId });

            modelBuilder.Entity<WishlistItem>()
                .HasKey(wi => new { wi.UserId, wi.ProductId });

            modelBuilder.Entity<CategoryTag>()
                .HasKey(ct => new { ct.CategoryId, ct.TagId });

            // Configure relationships
            modelBuilder.Entity<Product>()
                .HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Product>()
    .HasOne(p => p.Creator)
    .WithMany(u => u.Products)
    .HasForeignKey(p => p.CreatorId)
    .OnDelete(DeleteBehavior.Restrict); // Prevent multiple cascade paths


            modelBuilder.Entity<Review>()
                .HasOne(r => r.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Product)
                .WithMany(p => p.Reviews)
                .HasForeignKey(r => r.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Reviews are deleted with product

            modelBuilder.Entity<WishlistItem>()
                .HasOne(wi => wi.User)
                .WithMany(u => u.WishlistItems)
                .HasForeignKey(wi => wi.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WishlistItem>()
                .HasOne(wi => wi.Product)
                .WithMany(p => p.WishlistItems)
                .HasForeignKey(wi => wi.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Wishlist items are deleted with product

            modelBuilder.Entity<ProductView>()
                .HasOne(pv => pv.Product)
                .WithMany(p => p.ProductViews)
                .HasForeignKey(pv => pv.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Views are deleted with product

            

            modelBuilder.Entity<ProductTag>()
                .HasOne(pt => pt.Product)
                .WithMany(p => p.ProductTags)
                .HasForeignKey(pt => pt.ProductId)
                .OnDelete(DeleteBehavior.Cascade); // Join entry deleted with product

            modelBuilder.Entity<ProductTag>()
                .HasOne(pt => pt.Tag)
                .WithMany(t => t.ProductTags)
                .HasForeignKey(pt => pt.TagId)
                .OnDelete(DeleteBehavior.Restrict); // Keep tag if products reference it

            // Configure Category hierarchy (ParentCategoryId)
            modelBuilder.Entity<Category>()
                .HasOne(c => c.ParentCategory)
                .WithMany(c => c.Subcategories)
                .HasForeignKey(c => c.ParentCategoryId)
                .IsRequired(false) // ParentCategoryId can be NULL for top-level categories
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascading delete of parent if subcategories exist


            // midas updated
            // Order and OrderItem relationships
            //modelBuilder.Entity<Order>()
            //    .HasOne(o => o.Buyer)
            //    .WithMany(u => u.Orders)
            //    .HasForeignKey(o => o.BuyerId)
            //    .OnDelete(DeleteBehavior.Restrict);

            //modelBuilder.Entity<OrderItem>()
            //    .HasOne(oi => oi.Order)
            //    .WithMany(o => o.OrderItems)
            //    .HasForeignKey(oi => oi.OrderId)
            //    .OnDelete(DeleteBehavior.Cascade);

            //modelBuilder.Entity<OrderItem>()
            //    .HasOne(oi => oi.Product)
            //    .WithMany(p => p.Orders) // Renamed for clarity: Product has many OrderItems not Orders directly
            //    .HasForeignKey(oi => oi.ProductId)
            //    .OnDelete(DeleteBehavior.Restrict); // Product should not be deleted if it has order items

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Buyer)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems) // This line refers to the Order.OrderItems navigation property
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Product)
                .WithMany(p => p.OrderItems) // Corrected: Product has many OrderItems
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);



            // Configure User table with Salt
            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
                entity.HasIndex(e => e.Email).IsUnique(); // Ensure unique email

                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.Username).IsUnique(); // Ensure unique username

                entity.Property(e => e.HashedPassword).IsRequired();
                entity.Property(e => e.Salt).IsRequired().HasMaxLength(256); // Or appropriate length for your salt
                entity.Property(e => e.Role).IsRequired().HasMaxLength(50); // e.g., "Creator", "Buyer", "Admin"
            });

            // Configure Product table with Permalink uniqueness
            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasIndex(e => e.Permalink).IsUnique();
            });

            // Configure License table relationships
            modelBuilder.Entity<License>()
                .HasOne(l => l.Order)
                .WithMany(o => o.Licenses)
                .HasForeignKey(l => l.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<License>()
                .HasOne(l => l.Product)
                .WithMany(p => p.Licenses)
                .HasForeignKey(l => l.ProductId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent multiple cascade paths

            modelBuilder.Entity<License>()
                .HasOne(l => l.Buyer)
                .WithMany(u => u.Licenses)
                .HasForeignKey(l => l.BuyerId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent multiple cascade paths

            // Configure ModerationLog table relationships
            modelBuilder.Entity<ModerationLog>()
                .HasOne(m => m.Product)
                .WithMany()
                .HasForeignKey(m => m.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ModerationLog>()
                .HasOne(m => m.Admin)
                .WithMany()
                .HasForeignKey(m => m.AdminId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure personalization entities
            
            // UserPreference configuration
            modelBuilder.Entity<UserPreference>()
                .HasOne(up => up.User)
                .WithMany(u => u.UserPreferences)
                .HasForeignKey(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserPreference>()
                .HasOne(up => up.Category)
                .WithMany()
                .HasForeignKey(up => up.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserPreference>()
                .HasOne(up => up.Tag)
                .WithMany()
                .HasForeignKey(up => up.TagId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserPreference>()
                .HasIndex(up => new { up.UserId, up.CategoryId, up.TagId })
                .IsUnique();

            // UserInteraction configuration
            modelBuilder.Entity<UserInteraction>()
                .HasOne(ui => ui.User)
                .WithMany(u => u.UserInteractions)
                .HasForeignKey(ui => ui.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserInteraction>()
                .HasOne(ui => ui.Product)
                .WithMany(p => p.UserInteractions)
                .HasForeignKey(ui => ui.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserInteraction>()
                .HasIndex(ui => new { ui.UserId, ui.ProductId, ui.Type, ui.CreatedAt });

            // UserProfile configuration
            modelBuilder.Entity<UserProfile>()
                .HasOne(up => up.User)
                .WithOne()
                .HasForeignKey<UserProfile>(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserProfile>(entity =>
            {
                entity.Property(e => e.Profession).HasMaxLength(100);
                entity.Property(e => e.Industry).HasMaxLength(100);
                entity.Property(e => e.PreferredStyle).HasMaxLength(100);
                entity.Property(e => e.PreferredFormats).HasMaxLength(500);
            });

            // Configure PasswordResetToken table
            modelBuilder.Entity<PasswordResetToken>(entity =>
            {
                entity.Property(e => e.Token).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Token).IsUnique();
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.IsUsed).IsRequired();
                
                // Relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure EmailVerificationToken table
            modelBuilder.Entity<EmailVerificationToken>(entity =>
            {
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Token).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Token).IsUnique();
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.IsUsed).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.PendingUserData).IsRequired();
            });

            // Configure AccountDeletionToken table
            modelBuilder.Entity<AccountDeletionToken>(entity =>
            {
                entity.Property(e => e.Token).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Token).IsUnique();
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.IsUsed).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.DeletionData).IsRequired();
                
                // Relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure CreatorSubscription table
            modelBuilder.Entity<CreatorSubscription>(entity =>
            {
                entity.HasIndex(e => new { e.FollowerId, e.CreatorId }).IsUnique(); // Prevent duplicate subscriptions
                entity.HasIndex(e => e.CreatorId);
                entity.HasIndex(e => e.FollowerId);
                entity.HasIndex(e => e.IsActive);
                entity.HasIndex(e => e.IsDeleted);
                
                // Relationships
                entity.HasOne(e => e.Follower)
                    .WithMany()
                    .HasForeignKey(e => e.FollowerId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Creator)
                    .WithMany()
                    .HasForeignKey(e => e.CreatorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // --- Messaging configuration ---
            modelBuilder.Entity<Conversation>(entity =>
            {
                entity.HasIndex(e => new { e.CreatorId, e.CustomerId });
                entity.HasOne(e => e.Creator)
                    .WithMany()
                    .HasForeignKey(e => e.CreatorId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Customer)
                    .WithMany()
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
                entity.HasOne(e => e.Conversation)
                    .WithMany(c => c.Messages)
                    .HasForeignKey(e => e.ConversationId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Sender)
                    .WithMany()
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<MessageRequest>(entity =>
            {
                entity.HasIndex(e => e.ConversationId).IsUnique();
                entity.HasOne(e => e.Conversation)
                    .WithOne(c => c.MessageRequest)
                    .HasForeignKey<MessageRequest>(e => e.ConversationId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.RequestedByCustomer)
                    .WithMany()
                    .HasForeignKey(e => e.RequestedByCustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ServiceRequest>(entity =>
            {
                entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
                entity.HasOne(e => e.Conversation)
                    .WithMany(c => c.ServiceRequests)
                    .HasForeignKey(e => e.ConversationId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.RequestedByCustomer)
                    .WithMany()
                    .HasForeignKey(e => e.RequestedByCustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.Property(e => e.Currency).HasMaxLength(3);
            });

            modelBuilder.Entity<Delivery>(entity =>
            {
                entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
                entity.HasOne(e => e.Conversation)
                    .WithMany(c => c.Deliveries)
                    .HasForeignKey(e => e.ConversationId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ServiceRequest)
                    .WithMany()
                    .HasForeignKey(e => e.ServiceRequestId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.Product)
                    .WithMany()
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}