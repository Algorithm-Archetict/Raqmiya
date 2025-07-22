using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IFileRepo
    {
        public List<AddedFile> GetAll();
        public AddedFile GetById(int id);
        public void Delete(AddedFile file);
        public void Update(AddedFile file);
        public void Add(AddedFile file);
        public void Save();

    }
}
