'use strict';

/**
 * Сделано задание на звездочку
 * Реализованы методы or и and
 */
exports.isStar = false;

var funcPriority = { oneOf: 1,
    allOf: 1,
    filterIn: 1,
    sort: 2,
    select: 3,
    limitBy: 4,
    format: 4 };

function CollectionHandlerConstructor(collect) {
    this.collection = collect.slice();
    this.select = selectBy(this.collection);
    this.filterIn = filterBy(this.collection);
    this.sort = sortBy(this.collection);
    this.format = formatWith(this.collection);
    this.limitBy = limit(this.collection);
    this.oneOf = or(this);
    this.allOf = and(this);
}

function getNewRecordValues(record) {
    return function (newRecord, parameter) {
        if (Object.keys(record).indexOf(parameter) !== -1) {
            newRecord[parameter] = record[parameter];
        }

        return newRecord;
    };
}

function selectRecord(params) {
    return function (record) {
        return params.reduce(getNewRecordValues(record), {});
    };
}

function selectBy(collection) {
    return function (params) {
        if (params === []) {
            return new CollectionHandlerConstructor([]);
        }
        var selectedCollection = collection.map(selectRecord(params));

        return new CollectionHandlerConstructor(selectedCollection);
    };
}

function filterRecords(value, filterParams) {
    return function (record) {
        var recValue = record[value];

        return filterParams.indexOf(recValue) !== -1;
    };
}

function filterBy(collection) {
    return function (params) {
        var value = params[0];
        var filterParam = params[1];
        var filteredCollection = collection.filter(filterRecords(value, filterParam));

        return new CollectionHandlerConstructor(filteredCollection);
    };
}

function compareRecords(value, order) {
    return function (first, sec) {
        var firstValue = first[value];
        var secValue = sec[value];
        if (typeof firstValue === 'number' && typeof secValue === 'number') {
            return (firstValue - secValue) * order;
        }

        return firstValue.localeCompare(secValue) * order;
    };
}

function sortBy(collection) {
    return function (params) {
        var value = params[0];
        var order = params[1] === 'desc' ? -1 : 1;
        var sortedCollection = collection.sort(compareRecords(value, order));

        return new CollectionHandlerConstructor(sortedCollection);
    };
}

function formatRecordsBy(param, func) {
    return function (record) {
        var copyRecord = Object.assign({}, record);
        copyRecord[param] = func(copyRecord[param]);

        return copyRecord;
    };
}

function formatWith(collection) {
    return function (params) {
        var param = params[0];
        var func = params[1];
        var formattedCollection = collection.map(formatRecordsBy(param, func));

        return new CollectionHandlerConstructor(formattedCollection);
    };
}

function limit(collection) {
    return function (params) {
        var count = params[0];
        var limitedCollection = collection.slice(0, count);

        return new CollectionHandlerConstructor(limitedCollection);
    };
}

function compareFunc(func1, func2) {
    return funcPriority[func1.name] - funcPriority[func2.name];
}

function getAllAndRemoveSelect(newParams) {
    return function (selectParams, parameter) {
        if (parameter.name === 'select') {
            selectParams.push(parameter.params);
        } else {
            newParams.push(parameter);
        }

        return selectParams;
    };
}

function applyEachFunc(collection) {
    return function (func) {
        return collection[func.name](func.params).collection;
    };
}

function concatDistinct(concatCollection, records) {
    var filteredRecords = records.filter(function (record) {
        return concatCollection.indexOf(record) === -1;
    });

    return concatCollection.concat(filteredRecords);
}

function or(collection) {
    return function (params) {
        var concatDistinctCollection = params
            .map(applyEachFunc(collection))
            .reduce(concatDistinct, []);

        return new CollectionHandlerConstructor(concatDistinctCollection);
    };
}

function getIntersection(intersection, records) {
    return records.filter(function (record) {
        return intersection.indexOf(record) !== -1;
    });
}

function and(collection) {
    return function (params) {
        var intersectionOfCollections = params.map(applyEachFunc(collection))
            .reduce(getIntersection, collection.collection);

        return new CollectionHandlerConstructor(intersectionOfCollections);
    };
}

function applyFunctions(collectionHandler, func) {
    return collectionHandler[func.name](func.params);
}

function getSortedParams(params) {
    var newParams = [];
    var selectParams = params.reduce(getAllAndRemoveSelect(newParams), []);
    if (selectParams.length === 0) {
        return newParams.sort(compareFunc);
    }
    var selectIntersection = selectParams.reduce(getIntersection, selectParams[0] || []);
    if (selectIntersection.length === 0) {
        return [];
    }
    newParams.push({ name: 'select', params: selectIntersection });

    return newParams.sort(compareFunc);
}

function processQuery(collection, params) {
    var collectionHandler = new CollectionHandlerConstructor(collection);
    var sortedParams = getSortedParams(params);
    if (sortedParams.length === 0) {
        return [];
    }
    console.info(sortedParams);
    collectionHandler = sortedParams.reduce(applyFunctions, collectionHandler);

    return collectionHandler.collection;
}

/**
 * Запрос к коллекции
 * @param {Array} collection
 * @params {...Function} – Функции для запроса
 * @returns {Array}
 */

exports.query = function (collection) {
    var params = [].slice.call(arguments, 1);
    if (params.length === 0) {
        return collection.slice();
    }

    return processQuery(collection, params);
};

/**
 * Выбор полей
 * @params {...String}
 * @returns {Object}
 */
exports.select = function () {
    return { name: 'select', params: [].slice.call(arguments) };
};

/**
 * Фильтрация поля по массиву значений
 * @param {String} property – Свойство для фильтрации
 * @param {Array} values – Доступные значения
 * @returns {Object}
 */
exports.filterIn = function (property, values) {
    console.info(property, values);

    return { name: 'filterIn', params: [property, values] };
};

/**
 * Сортировка коллекции по полю
 * @param {String} property – Свойство для фильтрации
 * @param {String} order – Порядок сортировки (asc - по возрастанию; desc – по убыванию)
 * @returns {Object}
 */
exports.sortBy = function (property, order) {
    console.info(property, order);

    return { name: 'sort', params: [property, order] };
};

/**
 * Форматирование поля
 * @param {String} property – Свойство для фильтрации
 * @param {Function} formatter – Функция для форматирования
 * @returns {Object}
 */
exports.format = function (property, formatter) {
    console.info(property, formatter);

    return { name: 'format', params: [property, formatter] };
};

/**
 * Ограничение количества элементов в коллекции
 * @param {Number} count – Максимальное количество элементов
 * @returns {Object}
 */
exports.limit = function (count) {
    console.info(count);

    return { name: 'limitBy', params: [count] };
};

if (exports.isStar) {

    /**
     * Фильтрация, объединяющая фильтрующие функции
     * @star
     * @params {...Function} – Фильтрующие функции
     * @returns {Object}
     */
    exports.or = function () {
        return { name: 'oneOf', params: [].slice.call(arguments) };
    };

    /**
     * Фильтрация, пересекающая фильтрующие функции
     * @star
     * @params {...Function} – Фильтрующие функции
     * @returns {Object}
     */
    exports.and = function () {
        return { name: 'allOf', params: [].slice.call(arguments) };
    };
}
