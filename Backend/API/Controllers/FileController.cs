using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Require authentication for all actions
    public class FileController : ControllerBase
    {
        private readonly string _storagePath = Path.Combine(Directory.GetCurrentDirectory(), "FileStorage");

        public FileController()
        {
            if (!Directory.Exists(_storagePath))
                Directory.CreateDirectory(_storagePath);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            // Validation: limit file size to 10MB
            if (file.Length > 10 * 1024 * 1024)
                return BadRequest("File size exceeds 10MB limit.");

            // Validation: allow only certain file types (e.g., images and pdf)
            var allowedTypes = new[] { "image/jpeg", "image/png", "application/pdf" };
            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest("Invalid file type. Only JPEG, PNG, and PDF are allowed.");

            var filePath = Path.Combine(_storagePath, file.FileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            return Ok(new { file.FileName });
        }

        [HttpGet("download/{fileName}")]
        public IActionResult DownloadFile(string fileName)
        {
            var filePath = Path.Combine(_storagePath, fileName);
            if (!System.IO.File.Exists(filePath))
                return NotFound();
            var bytes = System.IO.File.ReadAllBytes(filePath);
            return File(bytes, "application/octet-stream", fileName);
        }

        [HttpGet("list")]
        public IActionResult ListFiles()
        {
            var files = Directory.GetFiles(_storagePath);
            var fileNames = new List<string>();
            foreach (var file in files)
            {
                fileNames.Add(Path.GetFileName(file));
            }
            return Ok(fileNames);
        }

        [HttpDelete("delete/{fileName}")]
        public IActionResult DeleteFile(string fileName)
        {
            var filePath = Path.Combine(_storagePath, fileName);
            if (!System.IO.File.Exists(filePath))
                return NotFound();
            System.IO.File.Delete(filePath);
            return Ok();
        }
    }
}
