using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.CategoryDTOs;
using Raqmiya.Infrastructure;
using System.Threading.Tasks;
using System.Collections.Generic;
using API.Constants;
using Shared.Constants;

namespace API.Controllers
{
    /// <summary>
    /// Controller for managing categories.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryRepository _categoryRepository;
        private readonly ILogger<CategoryController> _logger;

        public CategoryController(ICategoryRepository categoryRepository, ILogger<CategoryController> logger)
        {
            _categoryRepository = categoryRepository;
            _logger = logger;
        }

        /// <summary>
        /// Get all categories.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<CategoryDTO>), 200)]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _categoryRepository.GetAllCategoriesAsync();
            var result = categories.ConvertAll(c => new CategoryDTO { Id = c.Id, Name = c.Name, Description = c.Description });
            return Ok(result);
        }

        /// <summary>
        /// Get a category by ID.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(CategoryDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            return Ok(new CategoryDTO { Id = category.Id, Name = category.Name, Description = category.Description });
        }

        /// <summary>
        /// Create a new category.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(CategoryDTO), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CategoryCreateUpdateDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var category = new Category { Name = dto.Name, Description = dto.Description };
            await _categoryRepository.AddAsync(category);
            return CreatedAtAction(nameof(GetById), new { id = category.Id }, new CategoryDTO { Id = category.Id, Name = category.Name, Description = category.Description });
        }

        /// <summary>
        /// Update an existing category.
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(CategoryDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(int id, [FromBody] CategoryCreateUpdateDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            category.Name = dto.Name;
            category.Description = dto.Description;
            await _categoryRepository.UpdateAsync(category);
            return Ok(new CategoryDTO { Id = category.Id, Name = category.Name, Description = category.Description });
        }

        /// <summary>
        /// Delete a category by ID.
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Delete(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            await _categoryRepository.DeleteAsync(category);
            return NoContent();
        }
    }
}

