
namespace Raqmiya.Infrastructure
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
