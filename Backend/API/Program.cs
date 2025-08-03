using Core.Interfaces;
using Core.Services;
using Microsoft.OpenApi.Models;
using Raqmiya.Infrastructure;
using Raqmiya.Infrastructure.Data;
using System.Reflection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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

            // --- 3. Configure Services (Core/Business Logic Layer) ---
            builder.Services.AddScoped<IProductService, ProductService>();
            builder.Services.AddScoped<IAuthService, AuthService>(); // NEW: Auth Service

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
            });

            // --- 5. Configure Authorization ---
            builder.Services.AddAuthorization();

            // --- 6. Add Controllers and API-specific features ---
            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();

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
            if (app.Environment.IsDevelopment())
            {
                using (var scope = app.Services.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<RaqmiyaDbContext>();
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

            app.UseHttpsRedirection();

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

            app.Run();
        }
    }
}
