'use strict';

/**
 * Сделано задание на звездочку
 * Реализованы методы or и and
 */
exports.isStar = true;

var funcPriority = ['or', 'and', 'filterIn',
    'sortBy', 'select', 'limit', 'format'];

function getSelectedRecordValues(record) {
    return function (selectedRecord, parameter) {
        if (Object.keys(record).indexOf(parameter) !== -1) {
            selectedRecord[parameter] = record[parameter];
        }

        return selectedRecord;
    };
}

function getCopy(collection) {
    return collection.slice();
}

function select(collection, params) {

    return collection.map(function (record) {
        return params.reduce(getSelectedRecordValues(record), {});
    });
}

function filterIn(collection, params) {
    var value = params[0];
    var filterParams = params[1];

    return collection.filter(function (record) {
        return filterParams.indexOf(record[value]) !== -1;
    });
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

function sortBy(collection, params) {
    var value = params[0];
    var order = params[1] === 'desc' ? -1 : 1;

    return collection.slice().sort(compareRecords(value, order));
}


function format(collection, params) {
    var param = params[0];
    var getFormattedRecord = params[1];

    return collection.map(function (record) {
        var copyRecord = Object.assign({}, record);
        copyRecord[param] = getFormattedRecord(copyRecord[param]);

        return copyRecord;
    });
}

function limit(collection, params) {
    var count = params[0];

    return collection.slice(0, count);
}

function applyEachFunc(collection) {
    return function (parameter) {
        return parameter.func(collection, parameter.params);
    };
}

function concatDistinct(concatCollection, records) {
    records.forEach(function (record) {
        if (concatCollection.indexOf(record) === -1) {
            concatCollection.push(record);
        }
    });

    return concatCollection;
}

function or(collection, params) {
    var concatDistinctCollection = params
        .map(applyEachFunc(collection))
        .reduce(concatDistinct, []);

    return collection.filter(function (record) {
        return concatDistinctCollection.indexOf(record) !== -1;
    });
}

function getIntersection(intersection, records) {
    return records.filter(function (record) {
        return intersection.indexOf(record) !== -1;
    });
}

function and(collection, params) {
    var intersectionOfCollections = params
        .map(applyEachFunc(collection))
        .reduce(getIntersection, collection);

    return collection.filter(function (record) {
        return intersectionOfCollections.indexOf(record) !== -1;
    });
}

function compareFunc(param1, param2) {
    return funcPriority.indexOf(param1.func.name) - funcPriority.indexOf(param2.func.name);
}

function removeSelect(functionsWithoutSelect) {
    return function (selectParams, currentFunction) {
        if (currentFunction.func.name === 'select') {
            selectParams.push(currentFunction.params);
        } else {
            functionsWithoutSelect.push(currentFunction);
        }

        return selectParams;
    };
}

function getSortedParams(params) {
    var functionsWithoutSelect = [];
    var selectParams = params.reduce(removeSelect(functionsWithoutSelect), []);
    if (selectParams.length === 0) {
        return params.sort(compareFunc);
    }
    var selectIntersection = selectParams.reduce(getIntersection, selectParams[0] || []);
    if (selectIntersection.length === 0) {
        return [];
    }
    functionsWithoutSelect.push({ func: select, params: selectIntersection });

    return functionsWithoutSelect.sort(compareFunc);
}

function processQuery(inputCollection, params) {
    var copyCollection = getCopy(inputCollection);
    var sortedParams = getSortedParams(params);
    if (sortedParams.length === 0) {
        return [];
    }

    return sortedParams.reduce(function (collection, parameter) {
        return parameter.func(collection, parameter.params);
    }, copyCollection);
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
    return { func: select, params: [].slice.call(arguments) };
};

/**
 * Фильтрация поля по массиву значений
 * @param {String} property – Свойство для фильтрации
 * @param {Array} values – Доступные значения
 * @returns {Object}
 */
exports.filterIn = function (property, values) {
    console.info(property, values);

    return { func: filterIn, params: [property, values] };
};

/**
 * Сортировка коллекции по полю
 * @param {String} property – Свойство для фильтрации
 * @param {String} order – Порядок сортировки (asc - по возрастанию; desc – по убыванию)
 * @returns {Object}
 */
exports.sortBy = function (property, order) {
    console.info(property, order);

    return { func: sortBy, params: [property, order] };
};

/**
 * Форматирование поля
 * @param {String} property – Свойство для фильтрации
 * @param {Function} formatter – Функция для форматирования
 * @returns {Object}
 */
exports.format = function (property, formatter) {
    console.info(property, formatter);

    return { func: format, params: [property, formatter] };
};

/**
 * Ограничение количества элементов в коллекции
 * @param {Number} count – Максимальное количество элементов
 * @returns {Object}
 */
exports.limit = function (count) {
    console.info(count);

    return { func: limit, params: [count] };
};

if (exports.isStar) {

    /**
     * Фильтрация, объединяющая фильтрующие функции
     * @star
     * @params {...Function} – Фильтрующие функции
     * @returns {Object}
     */
    exports.or = function () {
        return { func: or, params: [].slice.call(arguments) };
    };

    /**
     * Фильтрация, пересекающая фильтрующие функции
     * @star
     * @params {...Function} – Фильтрующие функции
     * @returns {Object}
     */
    exports.and = function () {
        return { func: and, params: [].slice.call(arguments) };
    };
}
