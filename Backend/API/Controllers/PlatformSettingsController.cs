using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Raqmiya.Infrastructure;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [ApiController]
    [Route("api/platform-settings")]
    [Authorize(Roles = "Admin")]
    public class PlatformSettingsController : ControllerBase
    {
        private readonly RaqmiyaDbContext _context;
        private readonly ILogger<PlatformSettingsController> _logger;

        public PlatformSettingsController(RaqmiyaDbContext context, ILogger<PlatformSettingsController> logger)
        {
            _context = context;
            _logger = logger;
        }
        [HttpGet("commission-percentage")]
        public async Task<IActionResult> GetCommissionPercentage()
        {
            var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "DefaultCommissionPercentage");
            var value = setting != null ? setting.DecimalValue : 0.10m;
            return Ok(new { commissionPercentage = value });
        }

        [HttpPost("commission-percentage")]
        public async Task<IActionResult> SetCommissionPercentage([FromBody] CommissionUpdateDto dto)
        {
            if (dto.Percentage < 0 || dto.Percentage > 1) return BadRequest("Percentage must be between 0 and 1 (e.g., 0.10 = 10%).");

            var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "DefaultCommissionPercentage");
            if (setting == null)
            {
                setting = new PlatformSetting { Key = "DefaultCommissionPercentage", DecimalValue = dto.Percentage };
                _context.PlatformSettings.Add(setting);
            }
            else
            {
                setting.DecimalValue = dto.Percentage;
                setting.UpdatedAt = System.DateTime.UtcNow;
                _context.PlatformSettings.Update(setting);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Platform commission percentage set to {Percentage}", dto.Percentage);
            return Ok(new { commissionPercentage = dto.Percentage });
        }
    }
    public class CommissionUpdateDto
    {
        public decimal Percentage { get; set; }
    }
}
