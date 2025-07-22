using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IVariant
    {
        public List<Variant> GetAll();
        public Variant GetById(int id);
        public void Delete(Variant variant);
        public void Update(Variant variant);
        public void Add(Variant variant);
        public void Save();
    }
}
