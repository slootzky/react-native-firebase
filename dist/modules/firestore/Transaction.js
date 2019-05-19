/**
 * 
 * Firestore Transaction representation wrapper
 */
import { mergeFieldPathData } from './utils';
import { buildNativeMap } from './utils/serialize';

import DocumentSnapshot from './DocumentSnapshot';
import { isObject, isString } from '../../utils';
import FieldPath from './FieldPath';
import { getNativeModule } from '../../utils/native';

// TODO docs state all get requests must be made FIRST before any modifications
// TODO so need to validate that

/**
 * @class Transaction
 */
export default class Transaction {

  constructor(firestore, meta) {
    this._meta = meta;
    this._commandBuffer = [];
    this._firestore = firestore;
    this._pendingResult = undefined;
  }

  /**
   * -------------
   * INTERNAL API
   * -------------
   */

  /**
   * Clears the command buffer and any pending result in prep for
   * the next transaction iteration attempt.
   *
   * @private
   */
  _prepare() {
    this._commandBuffer = [];
    this._pendingResult = undefined;
  }

  /**
   * -------------
   *  PUBLIC API
   * -------------
   */

  /**
   * Reads the document referenced by the provided DocumentReference.
   *
   * @param documentRef DocumentReference A reference to the document to be retrieved. Value must not be null.
   *
   * @returns Promise<DocumentSnapshot>
   */
  get(documentRef) {
    // todo validate doc ref
    return getNativeModule(this._firestore).transactionGetDocument(this._meta.id, documentRef.path).then(result => new DocumentSnapshot(this._firestore, result));
  }

  /**
   * Writes to the document referred to by the provided DocumentReference.
   * If the document does not exist yet, it will be created. If you pass options,
   * the provided data can be merged into the existing document.
   *
   * @param documentRef DocumentReference A reference to the document to be created. Value must not be null.
   * @param data Object An object of the fields and values for the document.
   * @param options SetOptions An object to configure the set behavior.
   *        Pass {merge: true} to only replace the values specified in the data argument.
   *        Fields omitted will remain untouched.
   *
   * @returns {Transaction}
   */
  set(documentRef, data, options) {
    // todo validate doc ref
    // todo validate data is object
    this._commandBuffer.push({
      type: 'set',
      path: documentRef.path,
      data: buildNativeMap(data),
      options: options || {}
    });

    return this;
  }

  /**
   * Updates fields in the document referred to by this DocumentReference.
   * The update will fail if applied to a document that does not exist. Nested
   * fields can be updated by providing dot-separated field path strings or by providing FieldPath objects.
   *
   * @param documentRef DocumentReference A reference to the document to be updated. Value must not be null.
   * @param args any Either an object containing all of the fields and values to update,
   *        or a series of arguments alternating between fields (as string or FieldPath
   *        objects) and values.
   *
   * @returns {Transaction}
   */
  update(documentRef, ...args) {
    // todo validate doc ref
    let data = {};
    if (args.length === 1) {
      if (!isObject(args[0])) {
        throw new Error('Transaction.update failed: If using a single data argument, it must be an object.');
      }

      [data] = args;
    } else if (args.length % 2 === 1) {
      throw new Error('Transaction.update failed: Must have either a single object data argument, or equal numbers of data key/value pairs.');
    } else {
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        if (isString(key)) {
          data[key] = value;
        } else if (key instanceof FieldPath) {
          data = mergeFieldPathData(data, key._segments, value);
        } else {
          throw new Error(`Transaction.update failed: Argument at index ${i} must be a string or FieldPath`);
        }
      }
    }

    this._commandBuffer.push({
      type: 'update',
      path: documentRef.path,
      data: buildNativeMap(data)
    });

    return this;
  }

  /**
   * Deletes the document referred to by the provided DocumentReference.
   *
   * @param documentRef DocumentReference A reference to the document to be deleted. Value must not be null.
   *
   * @returns {Transaction}
   */
  delete(documentRef) {
    // todo validate doc ref
    this._commandBuffer.push({
      type: 'delete',
      path: documentRef.path
    });

    return this;
  }
}