using Google.Cloud.Vision.V1;
using System.IO;
using System.Threading.Tasks;

namespace API.Services
{
    public class FileModerationService
    {
        public async Task<bool> IsImageSafeAsync(Stream imageStream)
        {
            var client = ImageAnnotatorClient.Create();
            var image = Image.FromStream(imageStream);
            var response = await client.DetectSafeSearchAsync(image);

            // Flag if adult, violence, or racy content is likely
            if (response.Adult == Likelihood.Likely || response.Adult == Likelihood.VeryLikely ||
                response.Violence == Likelihood.Likely || response.Violence == Likelihood.VeryLikely ||
                response.Racy == Likelihood.Likely || response.Racy == Likelihood.VeryLikely)
                return false;

            return true;
        }
    }
}
