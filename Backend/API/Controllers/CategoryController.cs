using AutoMapper;
using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Raqmiya.Infrastructure;
using Shared.Constants;
using Shared.DTOs.CategoryDTOs;

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
        private readonly IMapper _mapper;

        public CategoryController(ICategoryRepository categoryRepository, ILogger<CategoryController> logger, IMapper mapper)
        {
            _categoryRepository = categoryRepository;
            _logger = logger;
            _mapper = mapper;
        }

        /// <summary>
        /// Get all categories.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<GeneralCategoryDTO>), 200)]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _categoryRepository.GetAllCategoriesAsync();
            var result = _mapper.Map<IEnumerable<GeneralCategoryDTO>>(categories);
            return Ok(result);
        }

        /// <summary>
        /// Get a category by ID.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(GeneralCategoryDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            return Ok(_mapper.Map<GeneralCategoryDTO>(category));
        }

        /// <summary>
        /// Create a new category.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(GeneralCategoryDTO), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CategoryCreateUpdateDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var category = _mapper.Map<Category>(dto);
            await _categoryRepository.AddAsync(category);
            return CreatedAtAction(nameof(GetById), new { id = category.Id }, _mapper.Map<GeneralCategoryDTO>(category));
        }

        /// <summary>
        /// Update an existing category.
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(GeneralCategoryDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(int id, [FromBody] CategoryCreateUpdateDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            _mapper.Map(dto, category);
            await _categoryRepository.UpdateAsync(category);
            return Ok(_mapper.Map<GeneralCategoryDTO>(category));
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
