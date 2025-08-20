using Google.Cloud.Vision.V1;
using System.IO;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Grpc.Core;

namespace API.Services
{
    public class FileModerationService
    {
        private readonly ImageAnnotatorClient? _client;
        private readonly ILogger<FileModerationService> _logger;

        public FileModerationService(ILogger<FileModerationService> logger)
        {
            try
            {
                var credentialsPath = Path.Combine(Directory.GetCurrentDirectory(), "credentials", "raqmiya-32f196845584.json");
                
                if (File.Exists(credentialsPath))
                {
                    Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialsPath);
                    _client = ImageAnnotatorClient.Create();
                }
                else
                {
                    logger.LogWarning("Google Cloud credentials file not found at {CredentialsPath}. Using default credentials.", credentialsPath);
                    _client = ImageAnnotatorClient.Create();
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to create Google Vision client. File moderation will be disabled.");
                _client = null;
            }
            
            _logger = logger;
        }

        public async Task<bool> IsImageSafeAsync(Stream imageStream)
        {
            // If client is null (initialization failed), skip moderation and allow the image
            if (_client == null)
            {
                _logger.LogWarning("Google Vision client is not available. Skipping content moderation.");
                return true;
            }

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
            catch (Grpc.Core.RpcException rpcEx)
            {
                // Handle specific Google API errors
                if (rpcEx.StatusCode == Grpc.Core.StatusCode.PermissionDenied)
                {
                    _logger.LogWarning("Google Vision API billing not enabled or insufficient permissions. Skipping content moderation. Error: {Error}", rpcEx.Message);
                    return true; // Allow the image when billing/permissions are not configured
                }
                else if (rpcEx.StatusCode == Grpc.Core.StatusCode.Unauthenticated)
                {
                    _logger.LogWarning("Google Vision API authentication failed. Skipping content moderation. Error: {Error}", rpcEx.Message);
                    return true; // Allow the image when authentication fails
                }
                else
                {
                    _logger.LogError(rpcEx, "Google Vision API error: {Error}", rpcEx.Message);
                    return true; // Allow the image for other API errors to prevent false positives
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during image moderation");
                return true; // Allow the image for unexpected errors to prevent blocking uploads
            }
        }
    }
}
