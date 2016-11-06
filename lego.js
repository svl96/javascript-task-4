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

function select(collection, args) {
    return collection.map(function (record) {
        return args.reduce(getSelectedRecordValues(record), {});
    });
}

function filterIn(collection, args) {
    var value = args[0];
    var filterParams = args[1];

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

function sortBy(collection, args) {
    var value = args[0];
    var order = args[1] === 'desc' ? -1 : 1;

    return collection.slice().sort(compareRecords(value, order));
}


function format(collection, args) {
    var parameter = args[0];
    var getFormattedRecord = args[1];

    return collection.map(function (record) {
        var copyRecord = Object.assign({}, record);
        copyRecord[parameter] = getFormattedRecord(copyRecord[parameter]);

        return copyRecord;
    });
}

function limit(collection, args) {
    var count = args[0];

    return collection.slice(0, count);
}

function applyEachFunc(collection) {
    return function (func) {
        return func.func(collection, func.args);
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

function or(collection, args) {
    var concatDistinctCollection = args
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

function and(collection, args) {
    var intersectionOfCollections = args
        .map(applyEachFunc(collection))
        .reduce(getIntersection, collection);

    return collection.filter(function (record) {
        return intersectionOfCollections.indexOf(record) !== -1;
    });
}

function compareFunc(func1, func2) {
    return funcPriority.indexOf(func1.func.name) - funcPriority.indexOf(func2.func.name);
}

function removeSelect(functionsWithoutSelect) {
    return function (selectArgs, currentFunction) {
        if (currentFunction.func.name === 'select') {
            selectArgs.push(currentFunction.args);
        } else {
            functionsWithoutSelect.push(currentFunction);
        }

        return selectArgs;
    };
}

function getSortedFunctions(functions) {
    var functionsWithoutSelect = [];
    var selectParams = functions.reduce(removeSelect(functionsWithoutSelect), []);
    if (!selectParams.length) {
        return functions.sort(compareFunc);
    }
    var selectIntersection = selectParams.reduce(getIntersection, selectParams[0] || []);
    if (!selectIntersection.length) {
        return [];
    }
    functionsWithoutSelect.push({ func: select, args: selectIntersection });

    return functionsWithoutSelect.sort(compareFunc);
}

function processQuery(inputCollection, functions) {
    var copyCollection = getCopy(inputCollection);
    var sortedFunctions = getSortedFunctions(functions);
    if (!sortedFunctions.length) {
        return [];
    }

    return sortedFunctions.reduce(function (collection, func) {
        return func.func(collection, func.args);
    }, copyCollection);
}

/**
 * Запрос к коллекции
 * @param {Array} collection
 * @args {...Function} – Функции для запроса
 * @returns {Array}
 */

exports.query = function (collection) {
    var params = [].slice.call(arguments, 1);
    if (!params.length) {
        return getCopy(collection);
    }

    return processQuery(collection, params);
};

/**
 * Выбор полей
 * @args {...String}
 * @returns {Object}
 */
exports.select = function () {
    return { func: select, args: [].slice.call(arguments) };
};

/**
 * Фильтрация поля по массиву значений
 * @param {String} property – Свойство для фильтрации
 * @param {Array} values – Доступные значения
 * @returns {Object}
 */
exports.filterIn = function (property, values) {
    console.info(property, values);

    return { func: filterIn, args: [property, values] };
};

/**
 * Сортировка коллекции по полю
 * @param {String} property – Свойство для фильтрации
 * @param {String} order – Порядок сортировки (asc - по возрастанию; desc – по убыванию)
 * @returns {Object}
 */
exports.sortBy = function (property, order) {
    console.info(property, order);

    return { func: sortBy, args: [property, order] };
};

/**
 * Форматирование поля
 * @param {String} property – Свойство для фильтрации
 * @param {Function} formatter – Функция для форматирования
 * @returns {Object}
 */
exports.format = function (property, formatter) {
    console.info(property, formatter);

    return { func: format, args: [property, formatter] };
};

/**
 * Ограничение количества элементов в коллекции
 * @param {Number} count – Максимальное количество элементов
 * @returns {Object}
 */
exports.limit = function (count) {
    console.info(count);

    return { func: limit, args: [count] };
};

if (exports.isStar) {

    /**
     * Фильтрация, объединяющая фильтрующие функции
     * @star
     * @args {...Function} – Фильтрующие функции
     * @returns {Object}
     */
    exports.or = function () {
        return { func: or, args: [].slice.call(arguments) };
    };

    /**
     * Фильтрация, пересекающая фильтрующие функции
     * @star
     * @args {...Function} – Фильтрующие функции
     * @returns {Object}
     */
    exports.and = function () {
        return { func: and, args: [].slice.call(arguments) };
    };
}
