
namespace Raqmiya.Infrastructure
{
    public interface ILicense
    {
        public List<License> GetAll();
        public License GetById(int id);
        public void Delete(License license);
        public void Update(License license);
        public void Add(License license);
        public void Save();
    }
}
