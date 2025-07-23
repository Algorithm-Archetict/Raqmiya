
namespace Raqmiya.Infrastructure
{
    public interface IReview
    {
        public List<Review> GetAll();
        public Review GetById(int id);
        public void Delete(Review review);
        public void Update(Review review);
        public void Add(Review review);
        public void Save();
    }
}
