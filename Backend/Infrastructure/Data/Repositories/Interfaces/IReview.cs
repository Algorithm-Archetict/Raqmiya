using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
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
