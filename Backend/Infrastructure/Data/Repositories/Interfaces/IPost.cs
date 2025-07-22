using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IPost
    {
        public List<Post> GetAll();
        public Post GetById(int id);
        public void Delete(Post post);
        public void Update(Post post);
        public void Add(Post post);
        public void Save();
    }
}
