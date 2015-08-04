/**
 * @overview Wraps remote storage interface and polling behavior.
 */
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 4,
 maxstatements: 200
 */
/* global $ */
'use strict';

var _ = require('../utils').getLodash();
var ObservableEvent = require('../ObservableEvent');
var NetSimApi = require('./NetSimApi');

/**
 * Maximum time (in milliseconds) that tables should wait between full cache
 * updates from the server.
 * @type {number}
 */
var DEFAULT_POLLING_DELAY_MS = 10000;

/**
 * Minimum wait time (in milliseconds) between refresh requests.
 * @type {number}
 */
var DEFAULT_REFRESH_THROTTLING_MS = 1000;

/**
 * Wraps the app storage table API in an object with local
 * caching and callbacks, which provides a notification API to the rest
 * of the NetSim code.
 * @param {!PubSubChannel} channel - The pubsub channel used to listen
 *        for changes to the table.cellPadding
 * @param {!string} shardID - The shard ID specific to this class' NetSim instance.
 * @param {!string} tableName - The name of the remote storage table to wrap.
 * @param {Object} [options] - Additional table configuration options
 * @param {boolean} [options.useIncrementalRefresh] - defaults to FALSE.  If
 *        TRUE, this table will only request content that is new since its
 *        last refresh, not the entire table contents.  Currently this option
 *        is not safe to use if you care about updates or deletes in the table.
 * @constructor
 * @throws {Error} if wrong number of arguments are provided.
 */
var NetSimTable = module.exports = function (channel, shardID, tableName, options) {
  // Require channel, shardID and tableName to be provided
  if (!channel) {
    throw new Error('channel is required');
  } else if (!shardID) {
    throw new Error('shardID is required');
  } else if (!tableName) {
    throw new Error('tableName is required');
  }

  /**
   * @type {PubSubChannel}
   * @private
   */
  this.channel_ = channel;
  this.channel_.subscribe(tableName, NetSimTable.prototype.onPubSubEvent.bind(this));

  /**
   * If TRUE, will only request deltas from remote storage.  Currently
   * unsafe if we care about more than inserts to the table.
   * @type {boolean}
   * @private
   */
  this.useIncrementalRefresh_ = !!(options && options.useIncrementalRefresh);

  /**
   * API object for making remote calls
   * @type {NetSimApi}
   * @private
   */
  this.api_ = NetSimApi.makeTableApi(shardID, tableName);

  /**
   * Event that fires when full table updates indicate a change,
   * when rows are added, or when rows are removed, or when rows change.
   * @type {ObservableEvent}
   */
  this.tableChange = new ObservableEvent();

  /**
   * Store table contents locally, so we can detect when changes occur.
   * @type {Object}
   * @private
   */
  this.cache_ = {};

  /**
   * The row ID of the most recently inserted row retrieved from remote storage.
   * @type {number}
   * @private
   */
  this.latestRowID_ = 0;

  /**
   * Unix timestamp for last time this table's cache contents were fully
   * updated.  Used to determine when to poll the server for changes.
   * @type {number}
   * @private
   */
  this.lastRefreshTime_ = 0;

  /**
   * Minimum time (in milliseconds) to wait between pulling full table contents
   * from remote storage.
   * @type {number}
   * @private
   */
  this.pollingInterval_ = DEFAULT_POLLING_DELAY_MS;

  /**
   * Throttled version (specific to this instance) of the refresh operation,
   * used to coalesce refresh requests.
   * @type {function}
   * @private
   */
  this.refreshTable_ = this.makeThrottledRefresh_(
      DEFAULT_REFRESH_THROTTLING_MS);
};

/**
 * Asynchronously retrieve new/updated table content from the server, using
 * whatever method is most appropriate to this table's configuration.
 * When done, updates the local cache and hits the provided callback to
 * indicate completion.
 * @param {NodeStyleCallback} [callback] - indicates completion of the operation.
 * @returns {jQuery.Promise} Guaranteed to resolve after the cache update,
 *          so .done() operations can interact with the cache.
 */
NetSimTable.prototype.refresh = function (callback) {
  callback = callback || function () {};

  var apiCall = this.useIncrementalRefresh_ ?
      this.api_.allRowsFromID.bind(this.api_, this.latestRowID_ + 1) :
      this.api_.allRows.bind(this.api_);
  var cacheUpdate = this.useIncrementalRefresh_ ?
      this.incrementalCacheUpdate_.bind(this) :
      this.fullCacheUpdate_.bind(this);

  var deferred = $.Deferred();
  apiCall(function (err, data) {
    if (err) {
      callback(err, data);
      deferred.reject(err);
    } else {
      cacheUpdate(data);
      callback(err, data);
      deferred.resolve();
    }
  });
  return deferred.promise();
};

/**
 * Generate throttled refresh function which will generate actual server
 * requests at the maximum given rate no matter how fast it is called. This
 * allows us to coalesce refresh events and reduce server load.
 * @param {number} waitMs - Minimum time (in milliseconds) to wait between
 *        refresh requests to the server.
 * @returns {function}
 * @private
 */
NetSimTable.prototype.makeThrottledRefresh_ = function (waitMs) {
  return _.throttle(this.refresh.bind(this, function () {}), waitMs);
};

/**
 * @returns {Array} all locally cached table rows
 */
NetSimTable.prototype.readAll = function () {
  return this.arrayFromCache_();
};

/**
 * @param {!number} id
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.read = function (id, callback) {
  this.api_.fetchRow(id, function (err, data) {
    if (err === null) {
      this.updateCacheRow_(id, data);
    }
    callback(err, data);
  }.bind(this));
};

/**
 * @param {Object} value
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.create = function (value, callback) {
  this.api_.createRow(value, function (err, data) {
    if (err === null) {
      this.addRowToCache_(data);
    }
    callback(err, data);
  }.bind(this));
};

/**
 * @param {!number} id
 * @param {Object} value
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.update = function (id, value, callback) {
  this.api_.updateRow(id, value, function (err, success) {
    if (err === null) {
      this.updateCacheRow_(id, value);
    }
    callback(err, success);
  }.bind(this));
};

/**
 * @param {!number} id
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.delete = function (id, callback) {
  this.api_.deleteRow(id, function (err, success) {
    if (err === null) {
      this.removeRowFromCache_(id);
    }
    callback(err, success);
  }.bind(this));
};

/**
 * Delete a row using a synchronous call. For use when navigating away from
 * the page; most of the time an asynchronous call is preferred.
 * @param id
 */
NetSimTable.prototype.synchronousDelete = function (id) {
  var async = false; // Force synchronous request
  this.api_.deleteRow(id, function (err) {
    if (err) {
      // Nothing we can really do with the error, as we're in the process of
      // navigating away. Throw so that high incidence rates will show up in
      // new relic.
      throw err;
    }
    this.removeRowFromCache_(id);
  }.bind(this), async);
};

/**
 * @param {Array} allRows
 * @private
 */
NetSimTable.prototype.fullCacheUpdate_ = function (allRows) {
  // Rebuild entire cache
  var maxRowID = 0;
  var newCache = allRows.reduce(function (prev, currentRow) {
    prev[currentRow.id] = currentRow;
    if (currentRow.id > maxRowID) {
      maxRowID = currentRow.id;
    }
    return prev;
  }, {});

  // Check for changes, if anything changed notify all observers on table.
  if (!_.isEqual(this.cache_, newCache)) {
    this.cache_ = newCache;
    this.latestRowID_ = maxRowID;
    this.tableChange.notifyObservers(this.arrayFromCache_());
  }

  this.lastRefreshTime_ = Date.now();
};

/**
 * Add and update rows in the local cache from the given set of new rows
 * (probably retrieved from the server).
 * @param {Array} newRows
 * @private
 */
NetSimTable.prototype.incrementalCacheUpdate_ = function (newRows) {
  if (newRows.length > 0) {
    var maxRowID = 0;
    newRows.forEach(function (row) {
      this.cache_[row.id] = row;
      maxRowID = Math.max(maxRowID, row.id);
    }, this);
    this.latestRowID_ = maxRowID;
    this.tableChange.notifyObservers(this.arrayFromCache_());
  }

  this.lastRefreshTime_ = Date.now();
};

/**
 * @param {!Object} row
 * @param {!number} row.id
 * @private
 */
NetSimTable.prototype.addRowToCache_ = function (row) {
  this.cache_[row.id] = row;
  this.tableChange.notifyObservers(this.arrayFromCache_());
};

/**
 * @param {!number} id
 * @private
 */
NetSimTable.prototype.removeRowFromCache_ = function (id) {
  if (this.cache_[id] !== undefined) {
    delete this.cache_[id];
    this.tableChange.notifyObservers(this.arrayFromCache_());
  }
};

/**
 * @param {!number} id
 * @param {!Object} row
 * @private
 */
NetSimTable.prototype.updateCacheRow_ = function (id, row) {
  var oldRow = this.cache_[id];
  var newRow = row;

  // Manually apply ID which should be present in row.
  newRow.id = id;

  if (!_.isEqual(oldRow, newRow)) {
    this.cache_[id] = newRow;
    this.tableChange.notifyObservers(this.arrayFromCache_());
  }
};

/**
 * @returns {Array}
 * @private
 */
NetSimTable.prototype.arrayFromCache_ = function () {
  var result = [];
  for (var k in this.cache_) {
    if (this.cache_.hasOwnProperty(k)) {
      result.push(this.cache_[k]);
    }
  }
  return result;
};

/**
 * Changes how often this table fetches a full table update from the
 * server.
 * @param {number} intervalMs - milliseconds of delay between updates.
 */
NetSimTable.prototype.setPollingInterval = function (intervalMs) {
  this.pollingInterval_ = intervalMs;
};

/**
 * Change the maximum rate at which the refresh operation for this table
 * will _actually_ be executed, no matter how fast we receive invalidations.
 * @param {number} waitMs - Minimum number of milliseconds between invalidation-
 *        triggered requests to the server.
 */
NetSimTable.prototype.setRefreshThrottleTime = function (waitMs) {
  // To do this, we just replace the throttled refresh function with a new one.
  this.refreshTable_ = this.makeThrottledRefresh_(waitMs);
};

/** Polls server for updates, if it's been long enough. */
NetSimTable.prototype.tick = function () {
  var now = Date.now();
  if (now - this.lastRefreshTime_ > this.pollingInterval_) {
    this.lastRefreshTime_ = now;
    this.refreshTable_();
  }
};

/**
 * Called when the PubSub service fires an event that this table is subscribed to.
 * @param {Object} eventData
 */
NetSimTable.prototype.onPubSubEvent = function () {
  this.refreshTable_();
};
