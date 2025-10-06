// assets/my-simple-component.js

class MyCounter extends HTMLElement {
  constructor() {
    super();
    
    // Получаем DOM-элементы, с которыми будем работать, внутри компонента
    this.display = this.querySelector('[data-target="display"]');
    
    // Получаем начальное значение из Liquid через data-атрибут
    this.count = parseInt(this.dataset.startValue) || 0;
  }

  // **КЛЮЧЕВОЙ МЕТОД:** Вызывается, когда элемент добавляется в DOM
  connectedCallback() {
    this.render(); // Обновляем отображение при подключении
    
    // Настраиваем слушателей событий внутри компонента
    this.querySelector('[data-action="increase"]').addEventListener('click', this.increase.bind(this));
    this.querySelector('[data-action="decrease"]').addEventListener('click', this.decrease.bind(this));
    
    console.log(`MyCounter initialized with value: ${this.count}`);
  }

  // Метод для увеличения значения
  increase() {
    this.count++;
    this.render();
  }

  // Метод для уменьшения значения
  decrease() {
    this.count--;
    this.render();
  }
  
  // Метод для обновления DOM
  render() {
    this.display.textContent = this.count;
  }
}

// Регистрация компонента: связываем HTML-тег <my-counter> с классом MyCounter
customElements.define('my-counter', MyCounter);