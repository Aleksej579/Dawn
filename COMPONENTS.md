# Каталог компонентов Dawn — для Claude

Этот репозиторий — личная библиотека заготовок разработчика. Когда пользователь из другого проекта
отправляет сюда «взять компонент X», начинай с этого файла.

## Как переносить (порядок действий)
1. Прочитай раздел нужного компонента ниже: файлы, зависимости, куда подключать.
2. Определи целевую тему: Dawn-производная (есть `cart-drawer`, `global.js`, `pubsub.js`, `cart.js`) или нет.
3. Скопируй ровно перечисленные файлы, подключи (`render`, настройки, ключи локали) и перенастрой токены темы (`--color-*`) по комментариям в начале snippet'а.
4. Проверь `shopify theme check` в целевом проекте. Не считай компонент рабочим без проверки в браузере — здесь это не проверялось.
5. Ничего лишнего из целевого проекта не удаляй. Комментарии в коде — на английском, общение — на русском.

Общие свойства «cart-drawer-*» компонентов: один snippet = разметка + стили (+ скрипт); токены темы собраны в начале стилей; в комментарии snippet'а — Usage, Needs, TODO. Нативная вложенность CSS (браузеры с конца 2023). Ключи локали и настройки добавлены только в `en.default*.json`.

## Компоненты корзины-drawer

### cart-drawer-progress — прогресс-бар бесплатной доставки
- Файл: `snippets/cart-drawer-progress.liquid` (один).
- Подключение: `{% render 'cart-drawer-progress' %}` внутри `<cart-drawer-items>`, над формой. Параметр `threshold` переопределяет настройку.
- Настройка: `cart_free_shipping_threshold` (number, валюта магазина, 0 = скрыто) в `config/settings_schema.json` + `settings_data.json` + подпись в `locales/en.default.schema.json`.
- Ключи локали: `sections.cart.free_shipping_reached`, `sections.cart.free_shipping_remaining_html` (в тексте `<strong>{{ amount }}</strong>`).
- Зависимости от темы: `--color-foreground`; корзина должна перерисовываться сервером (Section Rendering API), как в Dawn.
- Известные ограничения: цифровые товары входят в зачёт порога; порог не пересчитывается для валют Markets.

### cart-drawer-recommendations — слайдер рекомендаций
- Файлы: `snippets/cart-drawer-recommendations.liquid` + `sections/cart-drawer-recommendations.liquid` (endpoint с карточками).
- Подключение: `{% render 'cart-drawer-recommendations' %}` внутри `<cart-drawer-items>`, под формой. Параметры: `heading`, `limit`.
- Настройка: `cart_show_recommendations` (checkbox) — schema, data, подпись в `en.default.schema.json`.
- Ключ локали: `sections.cart.recommendations_heading`; также используется `products.product.add_to_cart`.
- Зависимости: приложение Search & Discovery (complementary, запасной `related`); токены `--color-foreground`, `--color-button`, `--color-button-text`; Dawn-drawer (`cart-drawer.renderContents`, `getSectionsToRender`) — без него форма «Add» отправляется нативно, для drawer'а другой темы нужно переписать метод `add()`.
- Скрипт inline намеренно: `innerHTML` не выполняет скрипты, элемент должен определиться при первой загрузке страницы (поэтому стиль/скрипт выводятся и при пустой корзине).
- Поведение: 1 карточка + подглядывающая следующая, snap, drag мышью на один шаг, кэш запросов на страницу, до 4 товаров корзины в запросах.

### cart-drawer-payment-icons — иконки способов оплаты
- Файл: `snippets/cart-drawer-payment-icons.liquid` (один).
- Подключение: `{% render 'cart-drawer-payment-icons' %}` под кнопкой оформления в `.cart-drawer__footer`. Параметр `methods` ('visa,master,paypal') переопределяет `shop.enabled_payment_types`.
- Ключ локали: `sections.footer.payment` (есть в Dawn).
- Зависимости: только объекты Shopify (`payment_type_svg_tag`); токенов темы нет. Самый переносимый.
- Ограничение: некоторые локальные методы (iDEAL, Klarna и др.) могут не попадать в `enabled_payment_types` — задать через `methods`.

### cart-drawer-utility — купон + заметка к заказу
- Файлы: `snippets/cart-drawer-utility.liquid`, `assets/cart-drawer-utility.js`, `assets/component-cart-drawer-utility.css`, `assets/icon-coupon.svg`, `assets/icon-note.svg`.
- Подключение: `{% render 'cart-drawer-utility' %}` в `.drawer__footer` перед подытогом; в `snippets/cart-drawer.liquid` подключены CSS и `<script>` (после `cart.js`).
- Настройки: `show_cart_discount_code` (+ существующий `show_cart_note`).
- Локаль: `sections.cart.discount_code`, `discount_code_placeholder`, `apply_discount_code`, `discount_code_error`, `add_note`, `note`; `window.cartStrings.discountCodeError` в `layout/theme.liquid`.
- Зависимости от Dawn: `global.js` (`debounce`, `fetchConfig`, `routes`), `constants.js`/`pubsub.js`, `cart.js` (`CartItems.fetchCartData`, `cart-note`), базовые классы `.field`, `.button`, `.form__message`; `window.StandardEvents` необязателен.
- Полное описание и решения по дизайну: `~/Documents/cart-drawer-discount-note-component/README.md` (вне репозитория).

## Секция-конструктор
### 0-name
- Файлы: `sections/0-name.liquid`, `dev/scss/sections/0-name.out.scss`, `dev/js/0-name.out.js`. Описание, правила переименования и «не баги» — в `CLAUDE.md`.
- Копируется целиком тройкой, затем лишнее удаляется во всех трёх файлах.

## Как дополнять каталог
Новый компонент добавляй сюда сразу: файлы, точка подключения, настройки, ключи локали, зависимости, ограничения. Формат — как выше.
