using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Constants;
using Shared.DTOs.AdminDTOs;
using Raqmiya.Infrastructure;

namespace API.Controllers
{
    [ApiController]
    [Route("api/admin/settings")]
    [Authorize(Roles = RoleConstants.Admin)]
    public class AdminSettingsController : ControllerBase
    {
        private readonly RaqmiyaDbContext _db;
        private readonly ILogger<AdminSettingsController> _logger;

        public AdminSettingsController(RaqmiyaDbContext db, ILogger<AdminSettingsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        [HttpGet]
        [ProducesResponseType(typeof(SiteSettingsDTO), 200)]
        public ActionResult<SiteSettingsDTO> Get()
        {
            var s = _db.SiteSettings.FirstOrDefault() ?? new SiteSetting();
            return Ok(new SiteSettingsDTO
            {
                SiteName = s.SiteName,
                SupportEmail = s.SupportEmail
            });
        }

        [HttpPut]
        [ProducesResponseType(200)]
        public async Task<IActionResult> Update([FromBody] SiteSettingsDTO dto)
        {
            var s = _db.SiteSettings.FirstOrDefault();
            if (s == null)
            {
                s = new SiteSetting();
                _db.SiteSettings.Add(s);
            }
            s.SiteName = dto.SiteName ?? string.Empty;
            s.SupportEmail = dto.SupportEmail ?? string.Empty;
            s.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}
