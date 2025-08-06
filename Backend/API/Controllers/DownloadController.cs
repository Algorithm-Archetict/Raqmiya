using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Core.Interfaces;
using System.Security.Claims;
using System.IO;
using Microsoft.Extensions.Logging;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DownloadController : ControllerBase
    {
        private readonly IPurchaseValidationService _purchaseValidationService;
        private readonly IProductService _productService;
        private readonly ILogger<DownloadController> _logger;

        public DownloadController(
            IPurchaseValidationService purchaseValidationService,
            IProductService productService,
            ILogger<DownloadController> logger)
        {
            _purchaseValidationService = purchaseValidationService;
            _productService = productService;
            _logger = logger;
        }

        [HttpPost("verify-access/{productId}")]
        [Authorize]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> VerifyProductAccess(int productId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            
            var license = await _purchaseValidationService.GetActiveLicenseAsync(userId, productId);
            if (license == null)
            {
                _logger.LogWarning("User {UserId} attempted to access product {ProductId} without valid license", userId, productId);
                return Forbid("You do not have access to this product.");
            }
            
            _logger.LogInformation("User {UserId} verified access to product {ProductId}", userId, productId);
            return Ok(new { hasAccess = true, licenseId = license.Id });
        }

        [HttpGet("file/{productId}/{fileId}")]
        [Authorize]
        [ProducesResponseType(typeof(FileResult), 200)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DownloadFile(int productId, int fileId)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                _logger.LogInformation("Download request - User: {UserId}, Product: {ProductId}, File: {FileId}", userId, productId, fileId);
                
                // Verify purchase
                var license = await _purchaseValidationService.GetActiveLicenseAsync(userId, productId);
                if (license == null)
                {
                    _logger.LogWarning("User {UserId} attempted to download file {FileId} from product {ProductId} without valid license", userId, fileId, productId);
                    return Forbid("You do not have access to this product.");
                }
                
                // Get file details
                var files = await _productService.GetProductFilesAsync(productId);
                var file = files.FirstOrDefault(f => f.Id == fileId);
                if (file == null)
                {
                    _logger.LogWarning("File {FileId} not found for product {ProductId}", fileId, productId);
                    return NotFound("File not found.");
                }
                
                _logger.LogInformation("File found: {FileName}, URL: {FileUrl}", file.Name, file.FileUrl);
                
                // Create download folder for this user
                var downloadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "download", userId.ToString());
                Directory.CreateDirectory(downloadFolder);
                _logger.LogInformation("Created download folder: {Folder}", downloadFolder);
                
                // Check if file exists in upload folder
                // Convert URL path to file system path
                var urlPath = file.FileUrl.Replace("http://localhost:5255/", "").Replace("https://localhost:5255/", "");
                var uploadFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", urlPath);
                var downloadFilePath = Path.Combine(downloadFolder, file.Name);
                
                _logger.LogInformation("Upload path: {UploadPath}, Download path: {DownloadPath}", uploadFilePath, downloadFilePath);
                _logger.LogInformation("Upload file exists: {Exists}", System.IO.File.Exists(uploadFilePath));
                _logger.LogInformation("Download file exists: {Exists}", System.IO.File.Exists(downloadFilePath));
                
                // Copy file from upload to download folder if it doesn't exist in download folder
                if (System.IO.File.Exists(uploadFilePath) && !System.IO.File.Exists(downloadFilePath))
                {
                    try
                    {
                        System.IO.File.Copy(uploadFilePath, downloadFilePath);
                        _logger.LogInformation("Copied file {FileName} from upload to download folder for user {UserId}", file.Name, userId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error copying file {FileName} to download folder for user {UserId}", file.Name, userId);
                        return StatusCode(500, "Error preparing file for download");
                    }
                }
                
                // Serve file from download folder
                if (!System.IO.File.Exists(downloadFilePath))
                {
                    _logger.LogError("File not found in download folder: {FilePath}", downloadFilePath);
                    return NotFound("File not found on server.");
                }
                
                var fileBytes = await System.IO.File.ReadAllBytesAsync(downloadFilePath);
                var contentType = GetContentType(file.Name);
                
                _logger.LogInformation("File {FileName} downloaded successfully for user {UserId}", file.Name, userId);
                
                return File(fileBytes, contentType, file.Name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in DownloadFile");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { 
                message = "Download controller is working",
                timestamp = DateTime.UtcNow
            });
        }

        [HttpGet("test-auth")]
        [Authorize]
        public IActionResult TestAuth()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userEmail = User.FindFirstValue(ClaimTypes.Email);
            
            return Ok(new { 
                message = "Authentication working",
                userId = userId,
                userEmail = userEmail,
                timestamp = DateTime.UtcNow
            });
        }

        [HttpPost("setup-download-folder/{userId}")]
        [Authorize]
        public async Task<IActionResult> SetupDownloadFolder(int userId)
        {
            try
            {
                var downloadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "download", userId.ToString());
                Directory.CreateDirectory(downloadFolder);
                
                _logger.LogInformation("Created download folder for user {UserId}: {Folder}", userId, downloadFolder);
                
                return Ok(new { 
                    message = "Download folder created successfully",
                    folder = downloadFolder
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating download folder for user {UserId}", userId);
                return StatusCode(500, "Failed to create download folder");
            }
        }

        private string GetContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".zip" => "application/zip",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".mp4" => "video/mp4",
                ".txt" => "text/plain",
                _ => "application/octet-stream"
            };
        }
    }
} 