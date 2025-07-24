
using Core.Interfaces;
using Core.Services;
using Microsoft.OpenApi.Models;
using Raqmiya.Infrastructure;
using System.Reflection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System;

namespace API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            //var builder = WebApplication.CreateBuilder(args);

            //// Add services to the container.

            //builder.Services.AddControllers();
            //// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            //builder.Services.AddEndpointsApiExplorer();
            //builder.Services.AddSwaggerGen();

            //var app = builder.Build();

            //// Configure the HTTP request pipeline.
            //if (app.Environment.IsDevelopment())
            //{
            //    app.UseSwagger();
            //    app.UseSwaggerUI();
            //}

            ////.UseHttpsRedirection();

            //app.UseAuthorization();


            //app.MapControllers();

            //app.Run();





            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            // --- 1. Configure DbContext ---
            //builder.Services.AddDbContext<RaqmiyaDbContext>(options =>
            //    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            //builder.Services.AddDbContext<RaqmiyaDbContext>(options =>
            //    options.UseSqlServer(
            //     builder.Configuration.GetConnectionString("DefaultConnection"),
            //    sqlOptions => sqlOptions.MigrationsAssembly("Infrastructure")
            //    )
            // );
            builder.Services.AddDbContext<RaqmiyaDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        x => x.MigrationsAssembly("Infrastructure") // ?? VERY IMPORTANT
    )
);



            // --- 2. Configure Repositories (Infrastructure Layer) ---
            builder.Services.AddScoped<IProductRepository, ProductRepository>();
            builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
            builder.Services.AddScoped<ITagRepository, TagRepository>();
            builder.Services.AddScoped<IUserRepository, UserRepository>(); // NEW: User Repository
            builder.Services.AddScoped<IAuthRepository, AuthRepository>();

            // --- 3. Configure Services (Core/Business Logic Layer) ---
            builder.Services.AddScoped<IProductService, ProductService>();
            builder.Services.AddScoped<IAuthService, AuthService>(); // NEW: Auth Service

            // --- 4. Configure Authentication (JWT Bearer) ---
            // Add Jwt settings to appsettings.json:
            // "Jwt": {
            //   "Issuer": "GumroadAPI",
            //   "Audience": "GumroadUI",
            //   "Secret": "YOUR_SUPER_SECRET_KEY_AT_LEAST_32_CHARS_LONG", // Make this strong and store securely
            //   "TokenValidityInHours": 24
            // }
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
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Gumroad API", Version = "v1" });

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

            app.UseAuthentication(); // Must be before Authorization
            app.UseAuthorization();

            app.MapControllers(); // Maps API endpoints

            app.Run();
        }
    }
}
