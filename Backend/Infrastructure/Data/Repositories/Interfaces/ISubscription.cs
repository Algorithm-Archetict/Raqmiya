using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface ISubscription
    {
        public List<Subscription> GetAll();
        public Subscription GetById(int id);
        public void Delete(Subscription subscription);
        public void Update(Subscription subscription);
        public void Add(Subscription subscription);
        public void Save();
    }
}
