using AutoMapper;
using Core.Interfaces;
using Core.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.OpenApi.Models;
using Raqmiya.Infrastructure;
using Raqmiya.Infrastructure.Data;
using Infrastructure.Data.Repositories.Interfaces;
using Infrastructure.Data.Repositories.Implementations;
using System.Reflection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using API.Hubs;
using Raqmiya.Infrastructure.Data.Repositories.Interfaces;
using Raqmiya.Infrastructure.Data.Repositories.Implementations;
using Core.Interfaces;
using Core.Services;

namespace API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            // --- 1. Configure DbContext ---
            builder.Services.AddDbContext<RaqmiyaDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // --- 2. Configure Repositories (Infrastructure Layer) ---
            builder.Services.AddScoped<IProductRepository, ProductRepository>();
            builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
            builder.Services.AddScoped<ITagRepository, TagRepository>();
            builder.Services.AddScoped<IUserRepository, UserRepository>(); // NEW: User Repository
            builder.Services.AddScoped<IAuthRepository, AuthRepository>(); // Register AuthRepository for IAuthRepository
            builder.Services.AddScoped<IOrderRepository,OrderRepository>(); // Register OrderRepository
            builder.Services.AddScoped<ILicenseRepository, LicenseRepository>(); // NEW: License Repository
            builder.Services.AddScoped<IPaymentMethodBalanceRepository, PaymentMethodBalanceRepository>(); // NEW: Payment Method Balance Repository
            builder.Services.AddScoped<IPasswordResetRepository, PasswordResetRepository>(); // NEW: Password Reset Repository
            builder.Services.AddScoped<IEmailVerificationRepository, EmailVerificationRepository>(); // NEW: Email Verification Repository
            builder.Services.AddScoped<IAccountDeletionRepository, AccountDeletionRepository>(); // NEW: Account Deletion Repository
builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>(); // NEW: Subscription Repository
            
            // --- 3. Configure Background Services ---
            builder.Services.AddHostedService<AccountCleanupService>(); // NEW: Account Cleanup Background Service
            builder.Services.AddHostedService<ProductCleanupService>(); // NEW: Product Cleanup Background Service
            
            // --- 4. Configure Services (Core/Business Logic Layer) ---
            builder.Services.AddScoped<IProductService, ProductService>();
            builder.Services.AddScoped<IAuthService, AuthService>(); // NEW: Auth Service
            builder.Services.AddScoped<IOrderService, Core.Services.OrderService>(); // Register OrderService
builder.Services.AddScoped<ISubscriptionService, Core.Services.SubscriptionService>(); // NEW: Subscription Service
            builder.Services.AddScoped<IPurchaseValidationService, PurchaseValidationService>(); // NEW: Purchase Validation Service
            builder.Services.AddScoped<ICartService, Core.Services.CartService>(); // NEW: Cart Service
            builder.Services.AddScoped<IEmailService, Core.Services.EmailService>(); // NEW: Email Service
            builder.Services.AddScoped<IRecommendationService, RecommendationService>(); // NEW: Recommendation Service for Personalization
            builder.Services.AddScoped<IStripeService, Core.Services.StripeService>(); // NEW: Stripe Service
            builder.Services.AddScoped<IRevenueAnalyticsService, Core.Services.RevenueAnalyticsService>(); // NEW: Revenue Analytics Service
            builder.Services.AddScoped<IPlatformAnalyticsService, Core.Services.PlatformAnalyticsService>(); // NEW: Platform Analytics Service
            builder.Services.AddScoped<ICurrencyService, Core.Services.CurrencyService>(); // NEW: Currency Service
            // Messaging
            builder.Services.AddScoped<IConversationRepository, ConversationRepository>();
            builder.Services.AddScoped<IMessageRepository, MessageRepository>();
            builder.Services.AddScoped<IMessageRequestRepository, MessageRequestRepository>();
            builder.Services.AddScoped<IServiceRequestRepository, ServiceRequestRepository>();
            builder.Services.AddScoped<IDeliveryRepository, DeliveryRepository>();
            builder.Services.AddScoped<IServiceRequestDeadlineChangeRepository, ServiceRequestDeadlineChangeRepository>();
            builder.Services.AddScoped<IMessagingService, MessagingService>();

            // --- 4. Configure Logging ---
            builder.Logging.AddConsole();
            builder.Logging.AddDebug();

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
                };

                // Allow SignalR to read JWT from query string for WebSockets/SSE
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"].ToString();
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/chat"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

            // --- 5. Register AutoMapper and FluentValidation ---
            builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());
            builder.Services.AddFluentValidationAutoValidation();
            builder.Services.AddValidatorsFromAssemblyContaining<Program>();

            // --- 6. Add Controllers and API-specific features ---
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                });
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            
            // --- SignalR ---
            builder.Services.AddSignalR(o =>
            {
                o.EnableDetailedErrors = true;
            });


            // --- 7. Configure Swagger/OpenAPI for JWT Authentication ---
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Raqmiya API", Version = "v1" ,Description= "Endpoints for E-Commerce platform" });

                // Configure Swagger to use JWT Bearer authentication
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });

                // Set the comments path for the Swagger JSON and UI.
                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                if (File.Exists(xmlPath))
                {
                    c.IncludeXmlComments(xmlPath);
                }

                // Use full type name as schemaId to avoid conflicts
                c.CustomSchemaIds(type => type.FullName);
            });

            // --- 8. Configure CORS ---
            // Adjust this to be more restrictive in production
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowSpecificOrigin",
                    builder => builder
                        .WithOrigins("http://localhost:4200") // Angular dev server default port
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials()); // If you're sending cookies/auth headers
            });

            var app = builder.Build();

            // --- SEED DATABASE IN DEVELOPMENT ---
            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RaqmiyaDbContext>();
                try
                {
                    // If there are migrations, apply them; otherwise ensure database is created
                    var pending = db.Database.GetPendingMigrations();
                    if (pending != null && pending.Any())
                    {
                        db.Database.Migrate();
                    }
                    else
                    {
                        db.Database.EnsureCreated();
                    }
                }
                catch (Exception ex)
                {
                    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbMigration");
                    logger.LogError(ex, "Database migration failed");
                }

                if (app.Environment.IsDevelopment())
                {
                    DbInitializer.Seed(db);
                }
            }

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                // Enable XML comments in Development for swagger to work
                // Go to project properties -> Build -> Output -> XML Documentation File
                // Check "Generate a file with API documentation"
            }

            // app.UseHttpsRedirection(); // Disabled for HTTP-only development

            // --- Use Static Files Middleware ---
            app.UseStaticFiles(); // Enable serving files from wwwroot

            // --- Use CORS Middleware ---
            app.UseCors("AllowSpecificOrigin");

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    context.Response.StatusCode = 500;
                    context.Response.ContentType = "application/json";
                    var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
                    if (error != null)
                    {
                        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalExceptionHandler");
                        logger.LogError(error.Error, "Unhandled exception: {Message}", error.Error.Message);
                        await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new {
                            error = "An unexpected error occurred.",
                            details = error.Error.Message
                        }));
                    }
                });
            });

            app.MapControllers();

            // --- Map SignalR Hubs ---
            app.MapHub<ChatHub>("/hubs/chat");

            app.Run();
        }
    }
}
