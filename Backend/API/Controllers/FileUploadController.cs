using Microsoft.AspNetCore.Mvc;
using API.Services;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileUploadController : ControllerBase
    {
        private readonly FileModerationService _moderationService;

        public FileUploadController()
        {
            _moderationService = new FileModerationService();
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            if (!file.ContentType.StartsWith("image"))
                return BadRequest("Only image files are supported.");

            using var stream = file.OpenReadStream();
            bool isSafe = await _moderationService.IsImageSafeAsync(stream);

            if (!isSafe)
                return BadRequest("Sensitive or inappropriate content detected.");

            // Save the file to wwwroot/uploads with a unique name
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsPath, uniqueFileName);
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            return Ok(new { message = "File uploaded successfully and passed moderation.", fileName = uniqueFileName, filePath = $"/uploads/{uniqueFileName}" });
        }
    }
}
