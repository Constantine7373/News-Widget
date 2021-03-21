class NewsWidget {
    constructor(selector) {
        this.selector = selector;
        this.$el = document.querySelector(selector);
        this.createContent();
        this.createIcon();
        this.renderInterface();
        this.toggler();
    }

    // запрос JSON
    async fetchData() {
        // APi server url
        const url = 'http://localhost:3000/News';
        let connectionTries = 1;
        const MAX_CONNECTIO_TRIES = 5;
        const CONNECTION_INTERVAL = 1000;
        // Getting JSON from server
        try {
            const response = await fetch(url, { method: 'GET' });
            let data = await response.json();
            if (data !== undefined && data.length != 0) {
                return data;
            } else if (connectionTries <= MAX_CONNECTIO_TRIES) {
                connectionTries++;
                setTimeout(fetchData, CONNECTION_INTERVAL);
            } else { throw new Error('Не удалось получить данные') }
        } catch (e) {
            console.error(e)
        }
    }

    // JSON -> айтемы новостей
    makeElements(data) {
        let newsElements = '';
        data.forEach(item => {
            let newsItem = `
                    <div class="widget__item" data-viewed="` +
                (item.watched || false) +
                `">
                        <p class="title">` +
                (item.title || 'Заголовок') +
                `</p>
                        <p class="author">` +
                (item.author || 'Автор неизвестен') +
                `</p>
                        <p class="date">` +
                (item.date || '') +
                `</p>
                        <a href="" class="item__link" target="_blank">` +
                (item.link || '') +
                `</a>
                    </div>`;
            newsElements += newsItem;

        })
        return newsElements;
    }
    // счетчик непрочтенных новостей
    newsAmount() {
        return document.querySelectorAll(this.selector + '__item[data-viewed="false"]').length;
    }
    // создаем контейнер для новостей
    createContent() {
        let content = document.createElement('div');
        content.classList.add('widget__content');
        this.content = content;
    }
    // создаем кнопку виджета
    createIcon() {
        this.icon = document.createElement('div');
        this.icon.classList.add('widget__icon');
        this.icon.setAttribute('aria-title', 'Открыть ленту новостей');
        this.icon.setAttribute('title', 'Открыть ленту новостей');
        this.icon.counter = document.createElement('div');
        this.icon.counter.classList.add('counter');
        this.icon.appendChild(this.icon.counter);
    }
    // рендерим элементы виджета
    renderInterface() {
        let fragment = document.createDocumentFragment();

        this.fetchData().then(data => this.makeElements(data))
            .then(newsElements => {
                this.content.innerHTML = newsElements;
                fragment.appendChild(this.content);
                fragment.appendChild(this.icon);
                this.$el.appendChild(fragment);
                this.icon.counter.innerHTML = this.newsAmount();
                this.itemViewedHandler();
            });
    }
    // развернуть\свернуть ленту
    toggler() {
        this.icon.addEventListener('click', () => {
            this.content.classList.toggle('active');
        });
    }
    // слушатель за количеством непрочтенных новостей
    itemViewedHandler() {
        let newsItems = this.$el.querySelectorAll(this.selector + '__item');
        newsItems.forEach(item => item.addEventListener('click', () => {
            item.dataset.viewed = true;
            this.icon.counter.innerHTML = this.newsAmount();
        }))
    }
}