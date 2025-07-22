using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IOfferCode
    {
        public List<OfferCode> GetAll();
        public OfferCode GetById(int id);
        public void Delete(OfferCode offerCode);
        public void Update(OfferCode offerCode);
        public void Add(OfferCode offerCode);
        public void Save();
    }
}
