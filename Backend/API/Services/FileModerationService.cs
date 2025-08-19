using Google.Cloud.Vision.V1;
using System.IO;
using System.Threading.Tasks;

namespace API.Services
{
    public class FileModerationService
    {
        private readonly ImageAnnotatorClient _client;
        private readonly ILogger<FileModerationService> _logger;

        public FileModerationService(ILogger<FileModerationService> logger)
        {
            _client = ImageAnnotatorClient.Create();
            _logger = logger;
        }

        public async Task<bool> IsImageSafeAsync(Stream imageStream)
        {
            try
            {
                var image = Image.FromStream(imageStream);
                var response = await _client.DetectSafeSearchAsync(image);

                // Flag if adult, violence, or racy content is likely
                if (response.Adult == Likelihood.Likely || response.Adult == Likelihood.VeryLikely ||
                    response.Violence == Likelihood.Likely || response.Violence == Likelihood.VeryLikely ||
                    response.Racy == Likelihood.Likely || response.Racy == Likelihood.VeryLikely)
                    return false;

                return true;
            }
            catch (Exception ex)
            {
                 _logger.LogError(ex, "Vision API error");
                return false;
            }
        }
    }
}
