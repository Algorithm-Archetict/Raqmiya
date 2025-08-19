using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Core.Interfaces;

namespace API.Controllers
{
    [ApiController]
    [Route("api/platform-analytics")]
    [Authorize(Roles = "Admin")]
    public class PlatformAnalyticsController : ControllerBase
    {
        private readonly IPlatformAnalyticsService _service;
        private readonly ILogger<PlatformAnalyticsController> _logger;

        public PlatformAnalyticsController(IPlatformAnalyticsService service, ILogger<PlatformAnalyticsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] string currency = "USD")
        {
            var result = await _service.GetSummaryAsync(currency);
            return Ok(result);
        }

        [HttpGet("monthly-series")]
        public async Task<IActionResult> GetMonthlySeries([FromQuery] string currency = "USD")
        {
            var result = await _service.GetMonthlySeriesAsync(currency);
            return Ok(result);
        }

        [HttpGet("top-creators")]
        public async Task<IActionResult> GetTopCreators([FromQuery] int count = 10, [FromQuery] string currency = "USD")
        {
            var result = await _service.GetTopCreatorsAsync(count, currency);
            return Ok(result);
        }

        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts([FromQuery] int count = 10, [FromQuery] string currency = "USD")
        {
            var result = await _service.GetTopProductsAsync(count, currency);
            return Ok(result);
        }
    }
}


