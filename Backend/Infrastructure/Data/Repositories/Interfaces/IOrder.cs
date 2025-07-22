using ITI_Raqmiya_MVC.Models;

namespace ITI_Raqmiya_MVC.Repository.Repository_Interface
{
    public interface IOrder
    {
        Order GetById(int id);
        IEnumerable<Order> GetAll(); // Admin
        IEnumerable<Order> GetByBuyerId(int buyerId);
        IEnumerable<Order> GetByEmail(string email); // Guest lookup
        void Add(Order order);
        void Update(Order order);
        void Delete(int id);
        void SaveChanges();
    }
}
