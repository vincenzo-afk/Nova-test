
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model WorkingMemoryEntry
 * 
 */
export type WorkingMemoryEntry = $Result.DefaultSelection<Prisma.$WorkingMemoryEntryPayload>
/**
 * Model RecentMemoryEntry
 * 
 */
export type RecentMemoryEntry = $Result.DefaultSelection<Prisma.$RecentMemoryEntryPayload>
/**
 * Model LongTermMemoryEntry
 * 
 */
export type LongTermMemoryEntry = $Result.DefaultSelection<Prisma.$LongTermMemoryEntryPayload>
/**
 * Model TaskCheckpoint
 * 
 */
export type TaskCheckpoint = $Result.DefaultSelection<Prisma.$TaskCheckpointPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more WorkingMemoryEntries
 * const workingMemoryEntries = await prisma.workingMemoryEntry.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more WorkingMemoryEntries
   * const workingMemoryEntries = await prisma.workingMemoryEntry.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.workingMemoryEntry`: Exposes CRUD operations for the **WorkingMemoryEntry** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more WorkingMemoryEntries
    * const workingMemoryEntries = await prisma.workingMemoryEntry.findMany()
    * ```
    */
  get workingMemoryEntry(): Prisma.WorkingMemoryEntryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.recentMemoryEntry`: Exposes CRUD operations for the **RecentMemoryEntry** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RecentMemoryEntries
    * const recentMemoryEntries = await prisma.recentMemoryEntry.findMany()
    * ```
    */
  get recentMemoryEntry(): Prisma.RecentMemoryEntryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.longTermMemoryEntry`: Exposes CRUD operations for the **LongTermMemoryEntry** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LongTermMemoryEntries
    * const longTermMemoryEntries = await prisma.longTermMemoryEntry.findMany()
    * ```
    */
  get longTermMemoryEntry(): Prisma.LongTermMemoryEntryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.taskCheckpoint`: Exposes CRUD operations for the **TaskCheckpoint** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TaskCheckpoints
    * const taskCheckpoints = await prisma.taskCheckpoint.findMany()
    * ```
    */
  get taskCheckpoint(): Prisma.TaskCheckpointDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    WorkingMemoryEntry: 'WorkingMemoryEntry',
    RecentMemoryEntry: 'RecentMemoryEntry',
    LongTermMemoryEntry: 'LongTermMemoryEntry',
    TaskCheckpoint: 'TaskCheckpoint'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "workingMemoryEntry" | "recentMemoryEntry" | "longTermMemoryEntry" | "taskCheckpoint"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      WorkingMemoryEntry: {
        payload: Prisma.$WorkingMemoryEntryPayload<ExtArgs>
        fields: Prisma.WorkingMemoryEntryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WorkingMemoryEntryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WorkingMemoryEntryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>
          }
          findFirst: {
            args: Prisma.WorkingMemoryEntryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WorkingMemoryEntryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>
          }
          findMany: {
            args: Prisma.WorkingMemoryEntryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>[]
          }
          create: {
            args: Prisma.WorkingMemoryEntryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>
          }
          createMany: {
            args: Prisma.WorkingMemoryEntryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WorkingMemoryEntryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>[]
          }
          delete: {
            args: Prisma.WorkingMemoryEntryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>
          }
          update: {
            args: Prisma.WorkingMemoryEntryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>
          }
          deleteMany: {
            args: Prisma.WorkingMemoryEntryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WorkingMemoryEntryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WorkingMemoryEntryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>[]
          }
          upsert: {
            args: Prisma.WorkingMemoryEntryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkingMemoryEntryPayload>
          }
          aggregate: {
            args: Prisma.WorkingMemoryEntryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWorkingMemoryEntry>
          }
          groupBy: {
            args: Prisma.WorkingMemoryEntryGroupByArgs<ExtArgs>
            result: $Utils.Optional<WorkingMemoryEntryGroupByOutputType>[]
          }
          count: {
            args: Prisma.WorkingMemoryEntryCountArgs<ExtArgs>
            result: $Utils.Optional<WorkingMemoryEntryCountAggregateOutputType> | number
          }
        }
      }
      RecentMemoryEntry: {
        payload: Prisma.$RecentMemoryEntryPayload<ExtArgs>
        fields: Prisma.RecentMemoryEntryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RecentMemoryEntryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RecentMemoryEntryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>
          }
          findFirst: {
            args: Prisma.RecentMemoryEntryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RecentMemoryEntryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>
          }
          findMany: {
            args: Prisma.RecentMemoryEntryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>[]
          }
          create: {
            args: Prisma.RecentMemoryEntryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>
          }
          createMany: {
            args: Prisma.RecentMemoryEntryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RecentMemoryEntryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>[]
          }
          delete: {
            args: Prisma.RecentMemoryEntryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>
          }
          update: {
            args: Prisma.RecentMemoryEntryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>
          }
          deleteMany: {
            args: Prisma.RecentMemoryEntryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RecentMemoryEntryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RecentMemoryEntryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>[]
          }
          upsert: {
            args: Prisma.RecentMemoryEntryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecentMemoryEntryPayload>
          }
          aggregate: {
            args: Prisma.RecentMemoryEntryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRecentMemoryEntry>
          }
          groupBy: {
            args: Prisma.RecentMemoryEntryGroupByArgs<ExtArgs>
            result: $Utils.Optional<RecentMemoryEntryGroupByOutputType>[]
          }
          count: {
            args: Prisma.RecentMemoryEntryCountArgs<ExtArgs>
            result: $Utils.Optional<RecentMemoryEntryCountAggregateOutputType> | number
          }
        }
      }
      LongTermMemoryEntry: {
        payload: Prisma.$LongTermMemoryEntryPayload<ExtArgs>
        fields: Prisma.LongTermMemoryEntryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LongTermMemoryEntryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LongTermMemoryEntryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>
          }
          findFirst: {
            args: Prisma.LongTermMemoryEntryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LongTermMemoryEntryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>
          }
          findMany: {
            args: Prisma.LongTermMemoryEntryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>[]
          }
          create: {
            args: Prisma.LongTermMemoryEntryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>
          }
          createMany: {
            args: Prisma.LongTermMemoryEntryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LongTermMemoryEntryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>[]
          }
          delete: {
            args: Prisma.LongTermMemoryEntryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>
          }
          update: {
            args: Prisma.LongTermMemoryEntryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>
          }
          deleteMany: {
            args: Prisma.LongTermMemoryEntryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LongTermMemoryEntryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.LongTermMemoryEntryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>[]
          }
          upsert: {
            args: Prisma.LongTermMemoryEntryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LongTermMemoryEntryPayload>
          }
          aggregate: {
            args: Prisma.LongTermMemoryEntryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLongTermMemoryEntry>
          }
          groupBy: {
            args: Prisma.LongTermMemoryEntryGroupByArgs<ExtArgs>
            result: $Utils.Optional<LongTermMemoryEntryGroupByOutputType>[]
          }
          count: {
            args: Prisma.LongTermMemoryEntryCountArgs<ExtArgs>
            result: $Utils.Optional<LongTermMemoryEntryCountAggregateOutputType> | number
          }
        }
      }
      TaskCheckpoint: {
        payload: Prisma.$TaskCheckpointPayload<ExtArgs>
        fields: Prisma.TaskCheckpointFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskCheckpointFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskCheckpointFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>
          }
          findFirst: {
            args: Prisma.TaskCheckpointFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskCheckpointFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>
          }
          findMany: {
            args: Prisma.TaskCheckpointFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>[]
          }
          create: {
            args: Prisma.TaskCheckpointCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>
          }
          createMany: {
            args: Prisma.TaskCheckpointCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskCheckpointCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>[]
          }
          delete: {
            args: Prisma.TaskCheckpointDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>
          }
          update: {
            args: Prisma.TaskCheckpointUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>
          }
          deleteMany: {
            args: Prisma.TaskCheckpointDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskCheckpointUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskCheckpointUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>[]
          }
          upsert: {
            args: Prisma.TaskCheckpointUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskCheckpointPayload>
          }
          aggregate: {
            args: Prisma.TaskCheckpointAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTaskCheckpoint>
          }
          groupBy: {
            args: Prisma.TaskCheckpointGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskCheckpointGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskCheckpointCountArgs<ExtArgs>
            result: $Utils.Optional<TaskCheckpointCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    workingMemoryEntry?: WorkingMemoryEntryOmit
    recentMemoryEntry?: RecentMemoryEntryOmit
    longTermMemoryEntry?: LongTermMemoryEntryOmit
    taskCheckpoint?: TaskCheckpointOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model WorkingMemoryEntry
   */

  export type AggregateWorkingMemoryEntry = {
    _count: WorkingMemoryEntryCountAggregateOutputType | null
    _min: WorkingMemoryEntryMinAggregateOutputType | null
    _max: WorkingMemoryEntryMaxAggregateOutputType | null
  }

  export type WorkingMemoryEntryMinAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    taskId: string | null
    contentRef: string | null
    schemaVersion: string | null
    contentChecksum: string | null
    createdAt: Date | null
  }

  export type WorkingMemoryEntryMaxAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    taskId: string | null
    contentRef: string | null
    schemaVersion: string | null
    contentChecksum: string | null
    createdAt: Date | null
  }

  export type WorkingMemoryEntryCountAggregateOutputType = {
    id: number
    workspaceId: number
    taskId: number
    contentRef: number
    schemaVersion: number
    contentChecksum: number
    createdAt: number
    _all: number
  }


  export type WorkingMemoryEntryMinAggregateInputType = {
    id?: true
    workspaceId?: true
    taskId?: true
    contentRef?: true
    schemaVersion?: true
    contentChecksum?: true
    createdAt?: true
  }

  export type WorkingMemoryEntryMaxAggregateInputType = {
    id?: true
    workspaceId?: true
    taskId?: true
    contentRef?: true
    schemaVersion?: true
    contentChecksum?: true
    createdAt?: true
  }

  export type WorkingMemoryEntryCountAggregateInputType = {
    id?: true
    workspaceId?: true
    taskId?: true
    contentRef?: true
    schemaVersion?: true
    contentChecksum?: true
    createdAt?: true
    _all?: true
  }

  export type WorkingMemoryEntryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WorkingMemoryEntry to aggregate.
     */
    where?: WorkingMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkingMemoryEntries to fetch.
     */
    orderBy?: WorkingMemoryEntryOrderByWithRelationInput | WorkingMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WorkingMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkingMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkingMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned WorkingMemoryEntries
    **/
    _count?: true | WorkingMemoryEntryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WorkingMemoryEntryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WorkingMemoryEntryMaxAggregateInputType
  }

  export type GetWorkingMemoryEntryAggregateType<T extends WorkingMemoryEntryAggregateArgs> = {
        [P in keyof T & keyof AggregateWorkingMemoryEntry]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWorkingMemoryEntry[P]>
      : GetScalarType<T[P], AggregateWorkingMemoryEntry[P]>
  }




  export type WorkingMemoryEntryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkingMemoryEntryWhereInput
    orderBy?: WorkingMemoryEntryOrderByWithAggregationInput | WorkingMemoryEntryOrderByWithAggregationInput[]
    by: WorkingMemoryEntryScalarFieldEnum[] | WorkingMemoryEntryScalarFieldEnum
    having?: WorkingMemoryEntryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WorkingMemoryEntryCountAggregateInputType | true
    _min?: WorkingMemoryEntryMinAggregateInputType
    _max?: WorkingMemoryEntryMaxAggregateInputType
  }

  export type WorkingMemoryEntryGroupByOutputType = {
    id: string
    workspaceId: string
    taskId: string
    contentRef: string
    schemaVersion: string
    contentChecksum: string
    createdAt: Date
    _count: WorkingMemoryEntryCountAggregateOutputType | null
    _min: WorkingMemoryEntryMinAggregateOutputType | null
    _max: WorkingMemoryEntryMaxAggregateOutputType | null
  }

  type GetWorkingMemoryEntryGroupByPayload<T extends WorkingMemoryEntryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WorkingMemoryEntryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WorkingMemoryEntryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WorkingMemoryEntryGroupByOutputType[P]>
            : GetScalarType<T[P], WorkingMemoryEntryGroupByOutputType[P]>
        }
      >
    >


  export type WorkingMemoryEntrySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    contentRef?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["workingMemoryEntry"]>

  export type WorkingMemoryEntrySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    contentRef?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["workingMemoryEntry"]>

  export type WorkingMemoryEntrySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    contentRef?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["workingMemoryEntry"]>

  export type WorkingMemoryEntrySelectScalar = {
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    contentRef?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    createdAt?: boolean
  }

  export type WorkingMemoryEntryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "workspaceId" | "taskId" | "contentRef" | "schemaVersion" | "contentChecksum" | "createdAt", ExtArgs["result"]["workingMemoryEntry"]>

  export type $WorkingMemoryEntryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "WorkingMemoryEntry"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      workspaceId: string
      taskId: string
      contentRef: string
      schemaVersion: string
      contentChecksum: string
      createdAt: Date
    }, ExtArgs["result"]["workingMemoryEntry"]>
    composites: {}
  }

  type WorkingMemoryEntryGetPayload<S extends boolean | null | undefined | WorkingMemoryEntryDefaultArgs> = $Result.GetResult<Prisma.$WorkingMemoryEntryPayload, S>

  type WorkingMemoryEntryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WorkingMemoryEntryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WorkingMemoryEntryCountAggregateInputType | true
    }

  export interface WorkingMemoryEntryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['WorkingMemoryEntry'], meta: { name: 'WorkingMemoryEntry' } }
    /**
     * Find zero or one WorkingMemoryEntry that matches the filter.
     * @param {WorkingMemoryEntryFindUniqueArgs} args - Arguments to find a WorkingMemoryEntry
     * @example
     * // Get one WorkingMemoryEntry
     * const workingMemoryEntry = await prisma.workingMemoryEntry.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WorkingMemoryEntryFindUniqueArgs>(args: SelectSubset<T, WorkingMemoryEntryFindUniqueArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one WorkingMemoryEntry that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WorkingMemoryEntryFindUniqueOrThrowArgs} args - Arguments to find a WorkingMemoryEntry
     * @example
     * // Get one WorkingMemoryEntry
     * const workingMemoryEntry = await prisma.workingMemoryEntry.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WorkingMemoryEntryFindUniqueOrThrowArgs>(args: SelectSubset<T, WorkingMemoryEntryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WorkingMemoryEntry that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkingMemoryEntryFindFirstArgs} args - Arguments to find a WorkingMemoryEntry
     * @example
     * // Get one WorkingMemoryEntry
     * const workingMemoryEntry = await prisma.workingMemoryEntry.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WorkingMemoryEntryFindFirstArgs>(args?: SelectSubset<T, WorkingMemoryEntryFindFirstArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WorkingMemoryEntry that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkingMemoryEntryFindFirstOrThrowArgs} args - Arguments to find a WorkingMemoryEntry
     * @example
     * // Get one WorkingMemoryEntry
     * const workingMemoryEntry = await prisma.workingMemoryEntry.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WorkingMemoryEntryFindFirstOrThrowArgs>(args?: SelectSubset<T, WorkingMemoryEntryFindFirstOrThrowArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more WorkingMemoryEntries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkingMemoryEntryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all WorkingMemoryEntries
     * const workingMemoryEntries = await prisma.workingMemoryEntry.findMany()
     * 
     * // Get first 10 WorkingMemoryEntries
     * const workingMemoryEntries = await prisma.workingMemoryEntry.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const workingMemoryEntryWithIdOnly = await prisma.workingMemoryEntry.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WorkingMemoryEntryFindManyArgs>(args?: SelectSubset<T, WorkingMemoryEntryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a WorkingMemoryEntry.
     * @param {WorkingMemoryEntryCreateArgs} args - Arguments to create a WorkingMemoryEntry.
     * @example
     * // Create one WorkingMemoryEntry
     * const WorkingMemoryEntry = await prisma.workingMemoryEntry.create({
     *   data: {
     *     // ... data to create a WorkingMemoryEntry
     *   }
     * })
     * 
     */
    create<T extends WorkingMemoryEntryCreateArgs>(args: SelectSubset<T, WorkingMemoryEntryCreateArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many WorkingMemoryEntries.
     * @param {WorkingMemoryEntryCreateManyArgs} args - Arguments to create many WorkingMemoryEntries.
     * @example
     * // Create many WorkingMemoryEntries
     * const workingMemoryEntry = await prisma.workingMemoryEntry.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WorkingMemoryEntryCreateManyArgs>(args?: SelectSubset<T, WorkingMemoryEntryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many WorkingMemoryEntries and returns the data saved in the database.
     * @param {WorkingMemoryEntryCreateManyAndReturnArgs} args - Arguments to create many WorkingMemoryEntries.
     * @example
     * // Create many WorkingMemoryEntries
     * const workingMemoryEntry = await prisma.workingMemoryEntry.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many WorkingMemoryEntries and only return the `id`
     * const workingMemoryEntryWithIdOnly = await prisma.workingMemoryEntry.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WorkingMemoryEntryCreateManyAndReturnArgs>(args?: SelectSubset<T, WorkingMemoryEntryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a WorkingMemoryEntry.
     * @param {WorkingMemoryEntryDeleteArgs} args - Arguments to delete one WorkingMemoryEntry.
     * @example
     * // Delete one WorkingMemoryEntry
     * const WorkingMemoryEntry = await prisma.workingMemoryEntry.delete({
     *   where: {
     *     // ... filter to delete one WorkingMemoryEntry
     *   }
     * })
     * 
     */
    delete<T extends WorkingMemoryEntryDeleteArgs>(args: SelectSubset<T, WorkingMemoryEntryDeleteArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one WorkingMemoryEntry.
     * @param {WorkingMemoryEntryUpdateArgs} args - Arguments to update one WorkingMemoryEntry.
     * @example
     * // Update one WorkingMemoryEntry
     * const workingMemoryEntry = await prisma.workingMemoryEntry.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WorkingMemoryEntryUpdateArgs>(args: SelectSubset<T, WorkingMemoryEntryUpdateArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more WorkingMemoryEntries.
     * @param {WorkingMemoryEntryDeleteManyArgs} args - Arguments to filter WorkingMemoryEntries to delete.
     * @example
     * // Delete a few WorkingMemoryEntries
     * const { count } = await prisma.workingMemoryEntry.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WorkingMemoryEntryDeleteManyArgs>(args?: SelectSubset<T, WorkingMemoryEntryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WorkingMemoryEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkingMemoryEntryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many WorkingMemoryEntries
     * const workingMemoryEntry = await prisma.workingMemoryEntry.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WorkingMemoryEntryUpdateManyArgs>(args: SelectSubset<T, WorkingMemoryEntryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WorkingMemoryEntries and returns the data updated in the database.
     * @param {WorkingMemoryEntryUpdateManyAndReturnArgs} args - Arguments to update many WorkingMemoryEntries.
     * @example
     * // Update many WorkingMemoryEntries
     * const workingMemoryEntry = await prisma.workingMemoryEntry.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more WorkingMemoryEntries and only return the `id`
     * const workingMemoryEntryWithIdOnly = await prisma.workingMemoryEntry.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WorkingMemoryEntryUpdateManyAndReturnArgs>(args: SelectSubset<T, WorkingMemoryEntryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one WorkingMemoryEntry.
     * @param {WorkingMemoryEntryUpsertArgs} args - Arguments to update or create a WorkingMemoryEntry.
     * @example
     * // Update or create a WorkingMemoryEntry
     * const workingMemoryEntry = await prisma.workingMemoryEntry.upsert({
     *   create: {
     *     // ... data to create a WorkingMemoryEntry
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the WorkingMemoryEntry we want to update
     *   }
     * })
     */
    upsert<T extends WorkingMemoryEntryUpsertArgs>(args: SelectSubset<T, WorkingMemoryEntryUpsertArgs<ExtArgs>>): Prisma__WorkingMemoryEntryClient<$Result.GetResult<Prisma.$WorkingMemoryEntryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of WorkingMemoryEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkingMemoryEntryCountArgs} args - Arguments to filter WorkingMemoryEntries to count.
     * @example
     * // Count the number of WorkingMemoryEntries
     * const count = await prisma.workingMemoryEntry.count({
     *   where: {
     *     // ... the filter for the WorkingMemoryEntries we want to count
     *   }
     * })
    **/
    count<T extends WorkingMemoryEntryCountArgs>(
      args?: Subset<T, WorkingMemoryEntryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WorkingMemoryEntryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a WorkingMemoryEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkingMemoryEntryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WorkingMemoryEntryAggregateArgs>(args: Subset<T, WorkingMemoryEntryAggregateArgs>): Prisma.PrismaPromise<GetWorkingMemoryEntryAggregateType<T>>

    /**
     * Group by WorkingMemoryEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkingMemoryEntryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WorkingMemoryEntryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WorkingMemoryEntryGroupByArgs['orderBy'] }
        : { orderBy?: WorkingMemoryEntryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WorkingMemoryEntryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWorkingMemoryEntryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the WorkingMemoryEntry model
   */
  readonly fields: WorkingMemoryEntryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for WorkingMemoryEntry.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WorkingMemoryEntryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the WorkingMemoryEntry model
   */
  interface WorkingMemoryEntryFieldRefs {
    readonly id: FieldRef<"WorkingMemoryEntry", 'String'>
    readonly workspaceId: FieldRef<"WorkingMemoryEntry", 'String'>
    readonly taskId: FieldRef<"WorkingMemoryEntry", 'String'>
    readonly contentRef: FieldRef<"WorkingMemoryEntry", 'String'>
    readonly schemaVersion: FieldRef<"WorkingMemoryEntry", 'String'>
    readonly contentChecksum: FieldRef<"WorkingMemoryEntry", 'String'>
    readonly createdAt: FieldRef<"WorkingMemoryEntry", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * WorkingMemoryEntry findUnique
   */
  export type WorkingMemoryEntryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which WorkingMemoryEntry to fetch.
     */
    where: WorkingMemoryEntryWhereUniqueInput
  }

  /**
   * WorkingMemoryEntry findUniqueOrThrow
   */
  export type WorkingMemoryEntryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which WorkingMemoryEntry to fetch.
     */
    where: WorkingMemoryEntryWhereUniqueInput
  }

  /**
   * WorkingMemoryEntry findFirst
   */
  export type WorkingMemoryEntryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which WorkingMemoryEntry to fetch.
     */
    where?: WorkingMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkingMemoryEntries to fetch.
     */
    orderBy?: WorkingMemoryEntryOrderByWithRelationInput | WorkingMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WorkingMemoryEntries.
     */
    cursor?: WorkingMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkingMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkingMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WorkingMemoryEntries.
     */
    distinct?: WorkingMemoryEntryScalarFieldEnum | WorkingMemoryEntryScalarFieldEnum[]
  }

  /**
   * WorkingMemoryEntry findFirstOrThrow
   */
  export type WorkingMemoryEntryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which WorkingMemoryEntry to fetch.
     */
    where?: WorkingMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkingMemoryEntries to fetch.
     */
    orderBy?: WorkingMemoryEntryOrderByWithRelationInput | WorkingMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WorkingMemoryEntries.
     */
    cursor?: WorkingMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkingMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkingMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WorkingMemoryEntries.
     */
    distinct?: WorkingMemoryEntryScalarFieldEnum | WorkingMemoryEntryScalarFieldEnum[]
  }

  /**
   * WorkingMemoryEntry findMany
   */
  export type WorkingMemoryEntryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which WorkingMemoryEntries to fetch.
     */
    where?: WorkingMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkingMemoryEntries to fetch.
     */
    orderBy?: WorkingMemoryEntryOrderByWithRelationInput | WorkingMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing WorkingMemoryEntries.
     */
    cursor?: WorkingMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkingMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkingMemoryEntries.
     */
    skip?: number
    distinct?: WorkingMemoryEntryScalarFieldEnum | WorkingMemoryEntryScalarFieldEnum[]
  }

  /**
   * WorkingMemoryEntry create
   */
  export type WorkingMemoryEntryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * The data needed to create a WorkingMemoryEntry.
     */
    data: XOR<WorkingMemoryEntryCreateInput, WorkingMemoryEntryUncheckedCreateInput>
  }

  /**
   * WorkingMemoryEntry createMany
   */
  export type WorkingMemoryEntryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many WorkingMemoryEntries.
     */
    data: WorkingMemoryEntryCreateManyInput | WorkingMemoryEntryCreateManyInput[]
  }

  /**
   * WorkingMemoryEntry createManyAndReturn
   */
  export type WorkingMemoryEntryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * The data used to create many WorkingMemoryEntries.
     */
    data: WorkingMemoryEntryCreateManyInput | WorkingMemoryEntryCreateManyInput[]
  }

  /**
   * WorkingMemoryEntry update
   */
  export type WorkingMemoryEntryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * The data needed to update a WorkingMemoryEntry.
     */
    data: XOR<WorkingMemoryEntryUpdateInput, WorkingMemoryEntryUncheckedUpdateInput>
    /**
     * Choose, which WorkingMemoryEntry to update.
     */
    where: WorkingMemoryEntryWhereUniqueInput
  }

  /**
   * WorkingMemoryEntry updateMany
   */
  export type WorkingMemoryEntryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update WorkingMemoryEntries.
     */
    data: XOR<WorkingMemoryEntryUpdateManyMutationInput, WorkingMemoryEntryUncheckedUpdateManyInput>
    /**
     * Filter which WorkingMemoryEntries to update
     */
    where?: WorkingMemoryEntryWhereInput
    /**
     * Limit how many WorkingMemoryEntries to update.
     */
    limit?: number
  }

  /**
   * WorkingMemoryEntry updateManyAndReturn
   */
  export type WorkingMemoryEntryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * The data used to update WorkingMemoryEntries.
     */
    data: XOR<WorkingMemoryEntryUpdateManyMutationInput, WorkingMemoryEntryUncheckedUpdateManyInput>
    /**
     * Filter which WorkingMemoryEntries to update
     */
    where?: WorkingMemoryEntryWhereInput
    /**
     * Limit how many WorkingMemoryEntries to update.
     */
    limit?: number
  }

  /**
   * WorkingMemoryEntry upsert
   */
  export type WorkingMemoryEntryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * The filter to search for the WorkingMemoryEntry to update in case it exists.
     */
    where: WorkingMemoryEntryWhereUniqueInput
    /**
     * In case the WorkingMemoryEntry found by the `where` argument doesn't exist, create a new WorkingMemoryEntry with this data.
     */
    create: XOR<WorkingMemoryEntryCreateInput, WorkingMemoryEntryUncheckedCreateInput>
    /**
     * In case the WorkingMemoryEntry was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WorkingMemoryEntryUpdateInput, WorkingMemoryEntryUncheckedUpdateInput>
  }

  /**
   * WorkingMemoryEntry delete
   */
  export type WorkingMemoryEntryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter which WorkingMemoryEntry to delete.
     */
    where: WorkingMemoryEntryWhereUniqueInput
  }

  /**
   * WorkingMemoryEntry deleteMany
   */
  export type WorkingMemoryEntryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WorkingMemoryEntries to delete
     */
    where?: WorkingMemoryEntryWhereInput
    /**
     * Limit how many WorkingMemoryEntries to delete.
     */
    limit?: number
  }

  /**
   * WorkingMemoryEntry without action
   */
  export type WorkingMemoryEntryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkingMemoryEntry
     */
    select?: WorkingMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkingMemoryEntry
     */
    omit?: WorkingMemoryEntryOmit<ExtArgs> | null
  }


  /**
   * Model RecentMemoryEntry
   */

  export type AggregateRecentMemoryEntry = {
    _count: RecentMemoryEntryCountAggregateOutputType | null
    _avg: RecentMemoryEntryAvgAggregateOutputType | null
    _sum: RecentMemoryEntrySumAggregateOutputType | null
    _min: RecentMemoryEntryMinAggregateOutputType | null
    _max: RecentMemoryEntryMaxAggregateOutputType | null
  }

  export type RecentMemoryEntryAvgAggregateOutputType = {
    confidence: number | null
  }

  export type RecentMemoryEntrySumAggregateOutputType = {
    confidence: number | null
  }

  export type RecentMemoryEntryMinAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    identityId: string | null
    sourceTaskId: string | null
    contentRef: string | null
    confidence: number | null
    schemaVersion: string | null
    contentChecksum: string | null
    status: string | null
    supersededById: string | null
    createdAt: Date | null
  }

  export type RecentMemoryEntryMaxAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    identityId: string | null
    sourceTaskId: string | null
    contentRef: string | null
    confidence: number | null
    schemaVersion: string | null
    contentChecksum: string | null
    status: string | null
    supersededById: string | null
    createdAt: Date | null
  }

  export type RecentMemoryEntryCountAggregateOutputType = {
    id: number
    workspaceId: number
    identityId: number
    sourceTaskId: number
    contentRef: number
    confidence: number
    schemaVersion: number
    contentChecksum: number
    status: number
    supersededById: number
    createdAt: number
    _all: number
  }


  export type RecentMemoryEntryAvgAggregateInputType = {
    confidence?: true
  }

  export type RecentMemoryEntrySumAggregateInputType = {
    confidence?: true
  }

  export type RecentMemoryEntryMinAggregateInputType = {
    id?: true
    workspaceId?: true
    identityId?: true
    sourceTaskId?: true
    contentRef?: true
    confidence?: true
    schemaVersion?: true
    contentChecksum?: true
    status?: true
    supersededById?: true
    createdAt?: true
  }

  export type RecentMemoryEntryMaxAggregateInputType = {
    id?: true
    workspaceId?: true
    identityId?: true
    sourceTaskId?: true
    contentRef?: true
    confidence?: true
    schemaVersion?: true
    contentChecksum?: true
    status?: true
    supersededById?: true
    createdAt?: true
  }

  export type RecentMemoryEntryCountAggregateInputType = {
    id?: true
    workspaceId?: true
    identityId?: true
    sourceTaskId?: true
    contentRef?: true
    confidence?: true
    schemaVersion?: true
    contentChecksum?: true
    status?: true
    supersededById?: true
    createdAt?: true
    _all?: true
  }

  export type RecentMemoryEntryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RecentMemoryEntry to aggregate.
     */
    where?: RecentMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RecentMemoryEntries to fetch.
     */
    orderBy?: RecentMemoryEntryOrderByWithRelationInput | RecentMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RecentMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RecentMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RecentMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RecentMemoryEntries
    **/
    _count?: true | RecentMemoryEntryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RecentMemoryEntryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RecentMemoryEntrySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RecentMemoryEntryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RecentMemoryEntryMaxAggregateInputType
  }

  export type GetRecentMemoryEntryAggregateType<T extends RecentMemoryEntryAggregateArgs> = {
        [P in keyof T & keyof AggregateRecentMemoryEntry]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRecentMemoryEntry[P]>
      : GetScalarType<T[P], AggregateRecentMemoryEntry[P]>
  }




  export type RecentMemoryEntryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RecentMemoryEntryWhereInput
    orderBy?: RecentMemoryEntryOrderByWithAggregationInput | RecentMemoryEntryOrderByWithAggregationInput[]
    by: RecentMemoryEntryScalarFieldEnum[] | RecentMemoryEntryScalarFieldEnum
    having?: RecentMemoryEntryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RecentMemoryEntryCountAggregateInputType | true
    _avg?: RecentMemoryEntryAvgAggregateInputType
    _sum?: RecentMemoryEntrySumAggregateInputType
    _min?: RecentMemoryEntryMinAggregateInputType
    _max?: RecentMemoryEntryMaxAggregateInputType
  }

  export type RecentMemoryEntryGroupByOutputType = {
    id: string
    workspaceId: string
    identityId: string
    sourceTaskId: string
    contentRef: string
    confidence: number
    schemaVersion: string
    contentChecksum: string
    status: string
    supersededById: string | null
    createdAt: Date
    _count: RecentMemoryEntryCountAggregateOutputType | null
    _avg: RecentMemoryEntryAvgAggregateOutputType | null
    _sum: RecentMemoryEntrySumAggregateOutputType | null
    _min: RecentMemoryEntryMinAggregateOutputType | null
    _max: RecentMemoryEntryMaxAggregateOutputType | null
  }

  type GetRecentMemoryEntryGroupByPayload<T extends RecentMemoryEntryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RecentMemoryEntryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RecentMemoryEntryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RecentMemoryEntryGroupByOutputType[P]>
            : GetScalarType<T[P], RecentMemoryEntryGroupByOutputType[P]>
        }
      >
    >


  export type RecentMemoryEntrySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    sourceTaskId?: boolean
    contentRef?: boolean
    confidence?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    status?: boolean
    supersededById?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["recentMemoryEntry"]>

  export type RecentMemoryEntrySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    sourceTaskId?: boolean
    contentRef?: boolean
    confidence?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    status?: boolean
    supersededById?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["recentMemoryEntry"]>

  export type RecentMemoryEntrySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    sourceTaskId?: boolean
    contentRef?: boolean
    confidence?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    status?: boolean
    supersededById?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["recentMemoryEntry"]>

  export type RecentMemoryEntrySelectScalar = {
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    sourceTaskId?: boolean
    contentRef?: boolean
    confidence?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
    status?: boolean
    supersededById?: boolean
    createdAt?: boolean
  }

  export type RecentMemoryEntryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "workspaceId" | "identityId" | "sourceTaskId" | "contentRef" | "confidence" | "schemaVersion" | "contentChecksum" | "status" | "supersededById" | "createdAt", ExtArgs["result"]["recentMemoryEntry"]>

  export type $RecentMemoryEntryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RecentMemoryEntry"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      workspaceId: string
      identityId: string
      sourceTaskId: string
      contentRef: string
      confidence: number
      schemaVersion: string
      contentChecksum: string
      status: string
      supersededById: string | null
      createdAt: Date
    }, ExtArgs["result"]["recentMemoryEntry"]>
    composites: {}
  }

  type RecentMemoryEntryGetPayload<S extends boolean | null | undefined | RecentMemoryEntryDefaultArgs> = $Result.GetResult<Prisma.$RecentMemoryEntryPayload, S>

  type RecentMemoryEntryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RecentMemoryEntryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RecentMemoryEntryCountAggregateInputType | true
    }

  export interface RecentMemoryEntryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RecentMemoryEntry'], meta: { name: 'RecentMemoryEntry' } }
    /**
     * Find zero or one RecentMemoryEntry that matches the filter.
     * @param {RecentMemoryEntryFindUniqueArgs} args - Arguments to find a RecentMemoryEntry
     * @example
     * // Get one RecentMemoryEntry
     * const recentMemoryEntry = await prisma.recentMemoryEntry.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RecentMemoryEntryFindUniqueArgs>(args: SelectSubset<T, RecentMemoryEntryFindUniqueArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RecentMemoryEntry that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RecentMemoryEntryFindUniqueOrThrowArgs} args - Arguments to find a RecentMemoryEntry
     * @example
     * // Get one RecentMemoryEntry
     * const recentMemoryEntry = await prisma.recentMemoryEntry.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RecentMemoryEntryFindUniqueOrThrowArgs>(args: SelectSubset<T, RecentMemoryEntryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RecentMemoryEntry that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecentMemoryEntryFindFirstArgs} args - Arguments to find a RecentMemoryEntry
     * @example
     * // Get one RecentMemoryEntry
     * const recentMemoryEntry = await prisma.recentMemoryEntry.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RecentMemoryEntryFindFirstArgs>(args?: SelectSubset<T, RecentMemoryEntryFindFirstArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RecentMemoryEntry that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecentMemoryEntryFindFirstOrThrowArgs} args - Arguments to find a RecentMemoryEntry
     * @example
     * // Get one RecentMemoryEntry
     * const recentMemoryEntry = await prisma.recentMemoryEntry.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RecentMemoryEntryFindFirstOrThrowArgs>(args?: SelectSubset<T, RecentMemoryEntryFindFirstOrThrowArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RecentMemoryEntries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecentMemoryEntryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RecentMemoryEntries
     * const recentMemoryEntries = await prisma.recentMemoryEntry.findMany()
     * 
     * // Get first 10 RecentMemoryEntries
     * const recentMemoryEntries = await prisma.recentMemoryEntry.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const recentMemoryEntryWithIdOnly = await prisma.recentMemoryEntry.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RecentMemoryEntryFindManyArgs>(args?: SelectSubset<T, RecentMemoryEntryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RecentMemoryEntry.
     * @param {RecentMemoryEntryCreateArgs} args - Arguments to create a RecentMemoryEntry.
     * @example
     * // Create one RecentMemoryEntry
     * const RecentMemoryEntry = await prisma.recentMemoryEntry.create({
     *   data: {
     *     // ... data to create a RecentMemoryEntry
     *   }
     * })
     * 
     */
    create<T extends RecentMemoryEntryCreateArgs>(args: SelectSubset<T, RecentMemoryEntryCreateArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RecentMemoryEntries.
     * @param {RecentMemoryEntryCreateManyArgs} args - Arguments to create many RecentMemoryEntries.
     * @example
     * // Create many RecentMemoryEntries
     * const recentMemoryEntry = await prisma.recentMemoryEntry.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RecentMemoryEntryCreateManyArgs>(args?: SelectSubset<T, RecentMemoryEntryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RecentMemoryEntries and returns the data saved in the database.
     * @param {RecentMemoryEntryCreateManyAndReturnArgs} args - Arguments to create many RecentMemoryEntries.
     * @example
     * // Create many RecentMemoryEntries
     * const recentMemoryEntry = await prisma.recentMemoryEntry.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RecentMemoryEntries and only return the `id`
     * const recentMemoryEntryWithIdOnly = await prisma.recentMemoryEntry.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RecentMemoryEntryCreateManyAndReturnArgs>(args?: SelectSubset<T, RecentMemoryEntryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RecentMemoryEntry.
     * @param {RecentMemoryEntryDeleteArgs} args - Arguments to delete one RecentMemoryEntry.
     * @example
     * // Delete one RecentMemoryEntry
     * const RecentMemoryEntry = await prisma.recentMemoryEntry.delete({
     *   where: {
     *     // ... filter to delete one RecentMemoryEntry
     *   }
     * })
     * 
     */
    delete<T extends RecentMemoryEntryDeleteArgs>(args: SelectSubset<T, RecentMemoryEntryDeleteArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RecentMemoryEntry.
     * @param {RecentMemoryEntryUpdateArgs} args - Arguments to update one RecentMemoryEntry.
     * @example
     * // Update one RecentMemoryEntry
     * const recentMemoryEntry = await prisma.recentMemoryEntry.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RecentMemoryEntryUpdateArgs>(args: SelectSubset<T, RecentMemoryEntryUpdateArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RecentMemoryEntries.
     * @param {RecentMemoryEntryDeleteManyArgs} args - Arguments to filter RecentMemoryEntries to delete.
     * @example
     * // Delete a few RecentMemoryEntries
     * const { count } = await prisma.recentMemoryEntry.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RecentMemoryEntryDeleteManyArgs>(args?: SelectSubset<T, RecentMemoryEntryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RecentMemoryEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecentMemoryEntryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RecentMemoryEntries
     * const recentMemoryEntry = await prisma.recentMemoryEntry.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RecentMemoryEntryUpdateManyArgs>(args: SelectSubset<T, RecentMemoryEntryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RecentMemoryEntries and returns the data updated in the database.
     * @param {RecentMemoryEntryUpdateManyAndReturnArgs} args - Arguments to update many RecentMemoryEntries.
     * @example
     * // Update many RecentMemoryEntries
     * const recentMemoryEntry = await prisma.recentMemoryEntry.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RecentMemoryEntries and only return the `id`
     * const recentMemoryEntryWithIdOnly = await prisma.recentMemoryEntry.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RecentMemoryEntryUpdateManyAndReturnArgs>(args: SelectSubset<T, RecentMemoryEntryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RecentMemoryEntry.
     * @param {RecentMemoryEntryUpsertArgs} args - Arguments to update or create a RecentMemoryEntry.
     * @example
     * // Update or create a RecentMemoryEntry
     * const recentMemoryEntry = await prisma.recentMemoryEntry.upsert({
     *   create: {
     *     // ... data to create a RecentMemoryEntry
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RecentMemoryEntry we want to update
     *   }
     * })
     */
    upsert<T extends RecentMemoryEntryUpsertArgs>(args: SelectSubset<T, RecentMemoryEntryUpsertArgs<ExtArgs>>): Prisma__RecentMemoryEntryClient<$Result.GetResult<Prisma.$RecentMemoryEntryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RecentMemoryEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecentMemoryEntryCountArgs} args - Arguments to filter RecentMemoryEntries to count.
     * @example
     * // Count the number of RecentMemoryEntries
     * const count = await prisma.recentMemoryEntry.count({
     *   where: {
     *     // ... the filter for the RecentMemoryEntries we want to count
     *   }
     * })
    **/
    count<T extends RecentMemoryEntryCountArgs>(
      args?: Subset<T, RecentMemoryEntryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RecentMemoryEntryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RecentMemoryEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecentMemoryEntryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RecentMemoryEntryAggregateArgs>(args: Subset<T, RecentMemoryEntryAggregateArgs>): Prisma.PrismaPromise<GetRecentMemoryEntryAggregateType<T>>

    /**
     * Group by RecentMemoryEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecentMemoryEntryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RecentMemoryEntryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RecentMemoryEntryGroupByArgs['orderBy'] }
        : { orderBy?: RecentMemoryEntryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RecentMemoryEntryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRecentMemoryEntryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RecentMemoryEntry model
   */
  readonly fields: RecentMemoryEntryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RecentMemoryEntry.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RecentMemoryEntryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RecentMemoryEntry model
   */
  interface RecentMemoryEntryFieldRefs {
    readonly id: FieldRef<"RecentMemoryEntry", 'String'>
    readonly workspaceId: FieldRef<"RecentMemoryEntry", 'String'>
    readonly identityId: FieldRef<"RecentMemoryEntry", 'String'>
    readonly sourceTaskId: FieldRef<"RecentMemoryEntry", 'String'>
    readonly contentRef: FieldRef<"RecentMemoryEntry", 'String'>
    readonly confidence: FieldRef<"RecentMemoryEntry", 'Float'>
    readonly schemaVersion: FieldRef<"RecentMemoryEntry", 'String'>
    readonly contentChecksum: FieldRef<"RecentMemoryEntry", 'String'>
    readonly status: FieldRef<"RecentMemoryEntry", 'String'>
    readonly supersededById: FieldRef<"RecentMemoryEntry", 'String'>
    readonly createdAt: FieldRef<"RecentMemoryEntry", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RecentMemoryEntry findUnique
   */
  export type RecentMemoryEntryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which RecentMemoryEntry to fetch.
     */
    where: RecentMemoryEntryWhereUniqueInput
  }

  /**
   * RecentMemoryEntry findUniqueOrThrow
   */
  export type RecentMemoryEntryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which RecentMemoryEntry to fetch.
     */
    where: RecentMemoryEntryWhereUniqueInput
  }

  /**
   * RecentMemoryEntry findFirst
   */
  export type RecentMemoryEntryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which RecentMemoryEntry to fetch.
     */
    where?: RecentMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RecentMemoryEntries to fetch.
     */
    orderBy?: RecentMemoryEntryOrderByWithRelationInput | RecentMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RecentMemoryEntries.
     */
    cursor?: RecentMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RecentMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RecentMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RecentMemoryEntries.
     */
    distinct?: RecentMemoryEntryScalarFieldEnum | RecentMemoryEntryScalarFieldEnum[]
  }

  /**
   * RecentMemoryEntry findFirstOrThrow
   */
  export type RecentMemoryEntryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which RecentMemoryEntry to fetch.
     */
    where?: RecentMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RecentMemoryEntries to fetch.
     */
    orderBy?: RecentMemoryEntryOrderByWithRelationInput | RecentMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RecentMemoryEntries.
     */
    cursor?: RecentMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RecentMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RecentMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RecentMemoryEntries.
     */
    distinct?: RecentMemoryEntryScalarFieldEnum | RecentMemoryEntryScalarFieldEnum[]
  }

  /**
   * RecentMemoryEntry findMany
   */
  export type RecentMemoryEntryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which RecentMemoryEntries to fetch.
     */
    where?: RecentMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RecentMemoryEntries to fetch.
     */
    orderBy?: RecentMemoryEntryOrderByWithRelationInput | RecentMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RecentMemoryEntries.
     */
    cursor?: RecentMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RecentMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RecentMemoryEntries.
     */
    skip?: number
    distinct?: RecentMemoryEntryScalarFieldEnum | RecentMemoryEntryScalarFieldEnum[]
  }

  /**
   * RecentMemoryEntry create
   */
  export type RecentMemoryEntryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * The data needed to create a RecentMemoryEntry.
     */
    data: XOR<RecentMemoryEntryCreateInput, RecentMemoryEntryUncheckedCreateInput>
  }

  /**
   * RecentMemoryEntry createMany
   */
  export type RecentMemoryEntryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RecentMemoryEntries.
     */
    data: RecentMemoryEntryCreateManyInput | RecentMemoryEntryCreateManyInput[]
  }

  /**
   * RecentMemoryEntry createManyAndReturn
   */
  export type RecentMemoryEntryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * The data used to create many RecentMemoryEntries.
     */
    data: RecentMemoryEntryCreateManyInput | RecentMemoryEntryCreateManyInput[]
  }

  /**
   * RecentMemoryEntry update
   */
  export type RecentMemoryEntryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * The data needed to update a RecentMemoryEntry.
     */
    data: XOR<RecentMemoryEntryUpdateInput, RecentMemoryEntryUncheckedUpdateInput>
    /**
     * Choose, which RecentMemoryEntry to update.
     */
    where: RecentMemoryEntryWhereUniqueInput
  }

  /**
   * RecentMemoryEntry updateMany
   */
  export type RecentMemoryEntryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RecentMemoryEntries.
     */
    data: XOR<RecentMemoryEntryUpdateManyMutationInput, RecentMemoryEntryUncheckedUpdateManyInput>
    /**
     * Filter which RecentMemoryEntries to update
     */
    where?: RecentMemoryEntryWhereInput
    /**
     * Limit how many RecentMemoryEntries to update.
     */
    limit?: number
  }

  /**
   * RecentMemoryEntry updateManyAndReturn
   */
  export type RecentMemoryEntryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * The data used to update RecentMemoryEntries.
     */
    data: XOR<RecentMemoryEntryUpdateManyMutationInput, RecentMemoryEntryUncheckedUpdateManyInput>
    /**
     * Filter which RecentMemoryEntries to update
     */
    where?: RecentMemoryEntryWhereInput
    /**
     * Limit how many RecentMemoryEntries to update.
     */
    limit?: number
  }

  /**
   * RecentMemoryEntry upsert
   */
  export type RecentMemoryEntryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * The filter to search for the RecentMemoryEntry to update in case it exists.
     */
    where: RecentMemoryEntryWhereUniqueInput
    /**
     * In case the RecentMemoryEntry found by the `where` argument doesn't exist, create a new RecentMemoryEntry with this data.
     */
    create: XOR<RecentMemoryEntryCreateInput, RecentMemoryEntryUncheckedCreateInput>
    /**
     * In case the RecentMemoryEntry was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RecentMemoryEntryUpdateInput, RecentMemoryEntryUncheckedUpdateInput>
  }

  /**
   * RecentMemoryEntry delete
   */
  export type RecentMemoryEntryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter which RecentMemoryEntry to delete.
     */
    where: RecentMemoryEntryWhereUniqueInput
  }

  /**
   * RecentMemoryEntry deleteMany
   */
  export type RecentMemoryEntryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RecentMemoryEntries to delete
     */
    where?: RecentMemoryEntryWhereInput
    /**
     * Limit how many RecentMemoryEntries to delete.
     */
    limit?: number
  }

  /**
   * RecentMemoryEntry without action
   */
  export type RecentMemoryEntryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RecentMemoryEntry
     */
    select?: RecentMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RecentMemoryEntry
     */
    omit?: RecentMemoryEntryOmit<ExtArgs> | null
  }


  /**
   * Model LongTermMemoryEntry
   */

  export type AggregateLongTermMemoryEntry = {
    _count: LongTermMemoryEntryCountAggregateOutputType | null
    _avg: LongTermMemoryEntryAvgAggregateOutputType | null
    _sum: LongTermMemoryEntrySumAggregateOutputType | null
    _min: LongTermMemoryEntryMinAggregateOutputType | null
    _max: LongTermMemoryEntryMaxAggregateOutputType | null
  }

  export type LongTermMemoryEntryAvgAggregateOutputType = {
    confidence: number | null
  }

  export type LongTermMemoryEntrySumAggregateOutputType = {
    confidence: number | null
  }

  export type LongTermMemoryEntryMinAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    identityId: string | null
    contentRef: string | null
    confidence: number | null
    verifiedAt: Date | null
    sourceLineageId: string | null
    schemaVersion: string | null
    contentChecksum: string | null
  }

  export type LongTermMemoryEntryMaxAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    identityId: string | null
    contentRef: string | null
    confidence: number | null
    verifiedAt: Date | null
    sourceLineageId: string | null
    schemaVersion: string | null
    contentChecksum: string | null
  }

  export type LongTermMemoryEntryCountAggregateOutputType = {
    id: number
    workspaceId: number
    identityId: number
    contentRef: number
    confidence: number
    verifiedAt: number
    sourceLineageId: number
    schemaVersion: number
    contentChecksum: number
    _all: number
  }


  export type LongTermMemoryEntryAvgAggregateInputType = {
    confidence?: true
  }

  export type LongTermMemoryEntrySumAggregateInputType = {
    confidence?: true
  }

  export type LongTermMemoryEntryMinAggregateInputType = {
    id?: true
    workspaceId?: true
    identityId?: true
    contentRef?: true
    confidence?: true
    verifiedAt?: true
    sourceLineageId?: true
    schemaVersion?: true
    contentChecksum?: true
  }

  export type LongTermMemoryEntryMaxAggregateInputType = {
    id?: true
    workspaceId?: true
    identityId?: true
    contentRef?: true
    confidence?: true
    verifiedAt?: true
    sourceLineageId?: true
    schemaVersion?: true
    contentChecksum?: true
  }

  export type LongTermMemoryEntryCountAggregateInputType = {
    id?: true
    workspaceId?: true
    identityId?: true
    contentRef?: true
    confidence?: true
    verifiedAt?: true
    sourceLineageId?: true
    schemaVersion?: true
    contentChecksum?: true
    _all?: true
  }

  export type LongTermMemoryEntryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LongTermMemoryEntry to aggregate.
     */
    where?: LongTermMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LongTermMemoryEntries to fetch.
     */
    orderBy?: LongTermMemoryEntryOrderByWithRelationInput | LongTermMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LongTermMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LongTermMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LongTermMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LongTermMemoryEntries
    **/
    _count?: true | LongTermMemoryEntryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LongTermMemoryEntryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LongTermMemoryEntrySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LongTermMemoryEntryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LongTermMemoryEntryMaxAggregateInputType
  }

  export type GetLongTermMemoryEntryAggregateType<T extends LongTermMemoryEntryAggregateArgs> = {
        [P in keyof T & keyof AggregateLongTermMemoryEntry]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLongTermMemoryEntry[P]>
      : GetScalarType<T[P], AggregateLongTermMemoryEntry[P]>
  }




  export type LongTermMemoryEntryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LongTermMemoryEntryWhereInput
    orderBy?: LongTermMemoryEntryOrderByWithAggregationInput | LongTermMemoryEntryOrderByWithAggregationInput[]
    by: LongTermMemoryEntryScalarFieldEnum[] | LongTermMemoryEntryScalarFieldEnum
    having?: LongTermMemoryEntryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LongTermMemoryEntryCountAggregateInputType | true
    _avg?: LongTermMemoryEntryAvgAggregateInputType
    _sum?: LongTermMemoryEntrySumAggregateInputType
    _min?: LongTermMemoryEntryMinAggregateInputType
    _max?: LongTermMemoryEntryMaxAggregateInputType
  }

  export type LongTermMemoryEntryGroupByOutputType = {
    id: string
    workspaceId: string
    identityId: string
    contentRef: string
    confidence: number
    verifiedAt: Date
    sourceLineageId: string
    schemaVersion: string
    contentChecksum: string
    _count: LongTermMemoryEntryCountAggregateOutputType | null
    _avg: LongTermMemoryEntryAvgAggregateOutputType | null
    _sum: LongTermMemoryEntrySumAggregateOutputType | null
    _min: LongTermMemoryEntryMinAggregateOutputType | null
    _max: LongTermMemoryEntryMaxAggregateOutputType | null
  }

  type GetLongTermMemoryEntryGroupByPayload<T extends LongTermMemoryEntryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LongTermMemoryEntryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LongTermMemoryEntryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LongTermMemoryEntryGroupByOutputType[P]>
            : GetScalarType<T[P], LongTermMemoryEntryGroupByOutputType[P]>
        }
      >
    >


  export type LongTermMemoryEntrySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    contentRef?: boolean
    confidence?: boolean
    verifiedAt?: boolean
    sourceLineageId?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
  }, ExtArgs["result"]["longTermMemoryEntry"]>

  export type LongTermMemoryEntrySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    contentRef?: boolean
    confidence?: boolean
    verifiedAt?: boolean
    sourceLineageId?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
  }, ExtArgs["result"]["longTermMemoryEntry"]>

  export type LongTermMemoryEntrySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    contentRef?: boolean
    confidence?: boolean
    verifiedAt?: boolean
    sourceLineageId?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
  }, ExtArgs["result"]["longTermMemoryEntry"]>

  export type LongTermMemoryEntrySelectScalar = {
    id?: boolean
    workspaceId?: boolean
    identityId?: boolean
    contentRef?: boolean
    confidence?: boolean
    verifiedAt?: boolean
    sourceLineageId?: boolean
    schemaVersion?: boolean
    contentChecksum?: boolean
  }

  export type LongTermMemoryEntryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "workspaceId" | "identityId" | "contentRef" | "confidence" | "verifiedAt" | "sourceLineageId" | "schemaVersion" | "contentChecksum", ExtArgs["result"]["longTermMemoryEntry"]>

  export type $LongTermMemoryEntryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LongTermMemoryEntry"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      workspaceId: string
      identityId: string
      contentRef: string
      confidence: number
      verifiedAt: Date
      sourceLineageId: string
      schemaVersion: string
      contentChecksum: string
    }, ExtArgs["result"]["longTermMemoryEntry"]>
    composites: {}
  }

  type LongTermMemoryEntryGetPayload<S extends boolean | null | undefined | LongTermMemoryEntryDefaultArgs> = $Result.GetResult<Prisma.$LongTermMemoryEntryPayload, S>

  type LongTermMemoryEntryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<LongTermMemoryEntryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: LongTermMemoryEntryCountAggregateInputType | true
    }

  export interface LongTermMemoryEntryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LongTermMemoryEntry'], meta: { name: 'LongTermMemoryEntry' } }
    /**
     * Find zero or one LongTermMemoryEntry that matches the filter.
     * @param {LongTermMemoryEntryFindUniqueArgs} args - Arguments to find a LongTermMemoryEntry
     * @example
     * // Get one LongTermMemoryEntry
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LongTermMemoryEntryFindUniqueArgs>(args: SelectSubset<T, LongTermMemoryEntryFindUniqueArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one LongTermMemoryEntry that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {LongTermMemoryEntryFindUniqueOrThrowArgs} args - Arguments to find a LongTermMemoryEntry
     * @example
     * // Get one LongTermMemoryEntry
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LongTermMemoryEntryFindUniqueOrThrowArgs>(args: SelectSubset<T, LongTermMemoryEntryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first LongTermMemoryEntry that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LongTermMemoryEntryFindFirstArgs} args - Arguments to find a LongTermMemoryEntry
     * @example
     * // Get one LongTermMemoryEntry
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LongTermMemoryEntryFindFirstArgs>(args?: SelectSubset<T, LongTermMemoryEntryFindFirstArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first LongTermMemoryEntry that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LongTermMemoryEntryFindFirstOrThrowArgs} args - Arguments to find a LongTermMemoryEntry
     * @example
     * // Get one LongTermMemoryEntry
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LongTermMemoryEntryFindFirstOrThrowArgs>(args?: SelectSubset<T, LongTermMemoryEntryFindFirstOrThrowArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more LongTermMemoryEntries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LongTermMemoryEntryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LongTermMemoryEntries
     * const longTermMemoryEntries = await prisma.longTermMemoryEntry.findMany()
     * 
     * // Get first 10 LongTermMemoryEntries
     * const longTermMemoryEntries = await prisma.longTermMemoryEntry.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const longTermMemoryEntryWithIdOnly = await prisma.longTermMemoryEntry.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LongTermMemoryEntryFindManyArgs>(args?: SelectSubset<T, LongTermMemoryEntryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a LongTermMemoryEntry.
     * @param {LongTermMemoryEntryCreateArgs} args - Arguments to create a LongTermMemoryEntry.
     * @example
     * // Create one LongTermMemoryEntry
     * const LongTermMemoryEntry = await prisma.longTermMemoryEntry.create({
     *   data: {
     *     // ... data to create a LongTermMemoryEntry
     *   }
     * })
     * 
     */
    create<T extends LongTermMemoryEntryCreateArgs>(args: SelectSubset<T, LongTermMemoryEntryCreateArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many LongTermMemoryEntries.
     * @param {LongTermMemoryEntryCreateManyArgs} args - Arguments to create many LongTermMemoryEntries.
     * @example
     * // Create many LongTermMemoryEntries
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LongTermMemoryEntryCreateManyArgs>(args?: SelectSubset<T, LongTermMemoryEntryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LongTermMemoryEntries and returns the data saved in the database.
     * @param {LongTermMemoryEntryCreateManyAndReturnArgs} args - Arguments to create many LongTermMemoryEntries.
     * @example
     * // Create many LongTermMemoryEntries
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LongTermMemoryEntries and only return the `id`
     * const longTermMemoryEntryWithIdOnly = await prisma.longTermMemoryEntry.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LongTermMemoryEntryCreateManyAndReturnArgs>(args?: SelectSubset<T, LongTermMemoryEntryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a LongTermMemoryEntry.
     * @param {LongTermMemoryEntryDeleteArgs} args - Arguments to delete one LongTermMemoryEntry.
     * @example
     * // Delete one LongTermMemoryEntry
     * const LongTermMemoryEntry = await prisma.longTermMemoryEntry.delete({
     *   where: {
     *     // ... filter to delete one LongTermMemoryEntry
     *   }
     * })
     * 
     */
    delete<T extends LongTermMemoryEntryDeleteArgs>(args: SelectSubset<T, LongTermMemoryEntryDeleteArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one LongTermMemoryEntry.
     * @param {LongTermMemoryEntryUpdateArgs} args - Arguments to update one LongTermMemoryEntry.
     * @example
     * // Update one LongTermMemoryEntry
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LongTermMemoryEntryUpdateArgs>(args: SelectSubset<T, LongTermMemoryEntryUpdateArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more LongTermMemoryEntries.
     * @param {LongTermMemoryEntryDeleteManyArgs} args - Arguments to filter LongTermMemoryEntries to delete.
     * @example
     * // Delete a few LongTermMemoryEntries
     * const { count } = await prisma.longTermMemoryEntry.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LongTermMemoryEntryDeleteManyArgs>(args?: SelectSubset<T, LongTermMemoryEntryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LongTermMemoryEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LongTermMemoryEntryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LongTermMemoryEntries
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LongTermMemoryEntryUpdateManyArgs>(args: SelectSubset<T, LongTermMemoryEntryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LongTermMemoryEntries and returns the data updated in the database.
     * @param {LongTermMemoryEntryUpdateManyAndReturnArgs} args - Arguments to update many LongTermMemoryEntries.
     * @example
     * // Update many LongTermMemoryEntries
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more LongTermMemoryEntries and only return the `id`
     * const longTermMemoryEntryWithIdOnly = await prisma.longTermMemoryEntry.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends LongTermMemoryEntryUpdateManyAndReturnArgs>(args: SelectSubset<T, LongTermMemoryEntryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one LongTermMemoryEntry.
     * @param {LongTermMemoryEntryUpsertArgs} args - Arguments to update or create a LongTermMemoryEntry.
     * @example
     * // Update or create a LongTermMemoryEntry
     * const longTermMemoryEntry = await prisma.longTermMemoryEntry.upsert({
     *   create: {
     *     // ... data to create a LongTermMemoryEntry
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LongTermMemoryEntry we want to update
     *   }
     * })
     */
    upsert<T extends LongTermMemoryEntryUpsertArgs>(args: SelectSubset<T, LongTermMemoryEntryUpsertArgs<ExtArgs>>): Prisma__LongTermMemoryEntryClient<$Result.GetResult<Prisma.$LongTermMemoryEntryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of LongTermMemoryEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LongTermMemoryEntryCountArgs} args - Arguments to filter LongTermMemoryEntries to count.
     * @example
     * // Count the number of LongTermMemoryEntries
     * const count = await prisma.longTermMemoryEntry.count({
     *   where: {
     *     // ... the filter for the LongTermMemoryEntries we want to count
     *   }
     * })
    **/
    count<T extends LongTermMemoryEntryCountArgs>(
      args?: Subset<T, LongTermMemoryEntryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LongTermMemoryEntryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LongTermMemoryEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LongTermMemoryEntryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LongTermMemoryEntryAggregateArgs>(args: Subset<T, LongTermMemoryEntryAggregateArgs>): Prisma.PrismaPromise<GetLongTermMemoryEntryAggregateType<T>>

    /**
     * Group by LongTermMemoryEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LongTermMemoryEntryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LongTermMemoryEntryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LongTermMemoryEntryGroupByArgs['orderBy'] }
        : { orderBy?: LongTermMemoryEntryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LongTermMemoryEntryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLongTermMemoryEntryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LongTermMemoryEntry model
   */
  readonly fields: LongTermMemoryEntryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LongTermMemoryEntry.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LongTermMemoryEntryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LongTermMemoryEntry model
   */
  interface LongTermMemoryEntryFieldRefs {
    readonly id: FieldRef<"LongTermMemoryEntry", 'String'>
    readonly workspaceId: FieldRef<"LongTermMemoryEntry", 'String'>
    readonly identityId: FieldRef<"LongTermMemoryEntry", 'String'>
    readonly contentRef: FieldRef<"LongTermMemoryEntry", 'String'>
    readonly confidence: FieldRef<"LongTermMemoryEntry", 'Float'>
    readonly verifiedAt: FieldRef<"LongTermMemoryEntry", 'DateTime'>
    readonly sourceLineageId: FieldRef<"LongTermMemoryEntry", 'String'>
    readonly schemaVersion: FieldRef<"LongTermMemoryEntry", 'String'>
    readonly contentChecksum: FieldRef<"LongTermMemoryEntry", 'String'>
  }
    

  // Custom InputTypes
  /**
   * LongTermMemoryEntry findUnique
   */
  export type LongTermMemoryEntryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which LongTermMemoryEntry to fetch.
     */
    where: LongTermMemoryEntryWhereUniqueInput
  }

  /**
   * LongTermMemoryEntry findUniqueOrThrow
   */
  export type LongTermMemoryEntryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which LongTermMemoryEntry to fetch.
     */
    where: LongTermMemoryEntryWhereUniqueInput
  }

  /**
   * LongTermMemoryEntry findFirst
   */
  export type LongTermMemoryEntryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which LongTermMemoryEntry to fetch.
     */
    where?: LongTermMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LongTermMemoryEntries to fetch.
     */
    orderBy?: LongTermMemoryEntryOrderByWithRelationInput | LongTermMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LongTermMemoryEntries.
     */
    cursor?: LongTermMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LongTermMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LongTermMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LongTermMemoryEntries.
     */
    distinct?: LongTermMemoryEntryScalarFieldEnum | LongTermMemoryEntryScalarFieldEnum[]
  }

  /**
   * LongTermMemoryEntry findFirstOrThrow
   */
  export type LongTermMemoryEntryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which LongTermMemoryEntry to fetch.
     */
    where?: LongTermMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LongTermMemoryEntries to fetch.
     */
    orderBy?: LongTermMemoryEntryOrderByWithRelationInput | LongTermMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LongTermMemoryEntries.
     */
    cursor?: LongTermMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LongTermMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LongTermMemoryEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LongTermMemoryEntries.
     */
    distinct?: LongTermMemoryEntryScalarFieldEnum | LongTermMemoryEntryScalarFieldEnum[]
  }

  /**
   * LongTermMemoryEntry findMany
   */
  export type LongTermMemoryEntryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter, which LongTermMemoryEntries to fetch.
     */
    where?: LongTermMemoryEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LongTermMemoryEntries to fetch.
     */
    orderBy?: LongTermMemoryEntryOrderByWithRelationInput | LongTermMemoryEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LongTermMemoryEntries.
     */
    cursor?: LongTermMemoryEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LongTermMemoryEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LongTermMemoryEntries.
     */
    skip?: number
    distinct?: LongTermMemoryEntryScalarFieldEnum | LongTermMemoryEntryScalarFieldEnum[]
  }

  /**
   * LongTermMemoryEntry create
   */
  export type LongTermMemoryEntryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * The data needed to create a LongTermMemoryEntry.
     */
    data: XOR<LongTermMemoryEntryCreateInput, LongTermMemoryEntryUncheckedCreateInput>
  }

  /**
   * LongTermMemoryEntry createMany
   */
  export type LongTermMemoryEntryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LongTermMemoryEntries.
     */
    data: LongTermMemoryEntryCreateManyInput | LongTermMemoryEntryCreateManyInput[]
  }

  /**
   * LongTermMemoryEntry createManyAndReturn
   */
  export type LongTermMemoryEntryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * The data used to create many LongTermMemoryEntries.
     */
    data: LongTermMemoryEntryCreateManyInput | LongTermMemoryEntryCreateManyInput[]
  }

  /**
   * LongTermMemoryEntry update
   */
  export type LongTermMemoryEntryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * The data needed to update a LongTermMemoryEntry.
     */
    data: XOR<LongTermMemoryEntryUpdateInput, LongTermMemoryEntryUncheckedUpdateInput>
    /**
     * Choose, which LongTermMemoryEntry to update.
     */
    where: LongTermMemoryEntryWhereUniqueInput
  }

  /**
   * LongTermMemoryEntry updateMany
   */
  export type LongTermMemoryEntryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LongTermMemoryEntries.
     */
    data: XOR<LongTermMemoryEntryUpdateManyMutationInput, LongTermMemoryEntryUncheckedUpdateManyInput>
    /**
     * Filter which LongTermMemoryEntries to update
     */
    where?: LongTermMemoryEntryWhereInput
    /**
     * Limit how many LongTermMemoryEntries to update.
     */
    limit?: number
  }

  /**
   * LongTermMemoryEntry updateManyAndReturn
   */
  export type LongTermMemoryEntryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * The data used to update LongTermMemoryEntries.
     */
    data: XOR<LongTermMemoryEntryUpdateManyMutationInput, LongTermMemoryEntryUncheckedUpdateManyInput>
    /**
     * Filter which LongTermMemoryEntries to update
     */
    where?: LongTermMemoryEntryWhereInput
    /**
     * Limit how many LongTermMemoryEntries to update.
     */
    limit?: number
  }

  /**
   * LongTermMemoryEntry upsert
   */
  export type LongTermMemoryEntryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * The filter to search for the LongTermMemoryEntry to update in case it exists.
     */
    where: LongTermMemoryEntryWhereUniqueInput
    /**
     * In case the LongTermMemoryEntry found by the `where` argument doesn't exist, create a new LongTermMemoryEntry with this data.
     */
    create: XOR<LongTermMemoryEntryCreateInput, LongTermMemoryEntryUncheckedCreateInput>
    /**
     * In case the LongTermMemoryEntry was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LongTermMemoryEntryUpdateInput, LongTermMemoryEntryUncheckedUpdateInput>
  }

  /**
   * LongTermMemoryEntry delete
   */
  export type LongTermMemoryEntryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
    /**
     * Filter which LongTermMemoryEntry to delete.
     */
    where: LongTermMemoryEntryWhereUniqueInput
  }

  /**
   * LongTermMemoryEntry deleteMany
   */
  export type LongTermMemoryEntryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LongTermMemoryEntries to delete
     */
    where?: LongTermMemoryEntryWhereInput
    /**
     * Limit how many LongTermMemoryEntries to delete.
     */
    limit?: number
  }

  /**
   * LongTermMemoryEntry without action
   */
  export type LongTermMemoryEntryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LongTermMemoryEntry
     */
    select?: LongTermMemoryEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the LongTermMemoryEntry
     */
    omit?: LongTermMemoryEntryOmit<ExtArgs> | null
  }


  /**
   * Model TaskCheckpoint
   */

  export type AggregateTaskCheckpoint = {
    _count: TaskCheckpointCountAggregateOutputType | null
    _avg: TaskCheckpointAvgAggregateOutputType | null
    _sum: TaskCheckpointSumAggregateOutputType | null
    _min: TaskCheckpointMinAggregateOutputType | null
    _max: TaskCheckpointMaxAggregateOutputType | null
  }

  export type TaskCheckpointAvgAggregateOutputType = {
    retryCount: number | null
  }

  export type TaskCheckpointSumAggregateOutputType = {
    retryCount: number | null
  }

  export type TaskCheckpointMinAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    taskId: string | null
    checkpointStatus: string | null
    state: string | null
    goal: string | null
    correlationId: string | null
    retryCount: number | null
    stepHistoryJson: string | null
    waitingUserReason: string | null
    reason: string | null
    updatedAt: Date | null
    createdAt: Date | null
  }

  export type TaskCheckpointMaxAggregateOutputType = {
    id: string | null
    workspaceId: string | null
    taskId: string | null
    checkpointStatus: string | null
    state: string | null
    goal: string | null
    correlationId: string | null
    retryCount: number | null
    stepHistoryJson: string | null
    waitingUserReason: string | null
    reason: string | null
    updatedAt: Date | null
    createdAt: Date | null
  }

  export type TaskCheckpointCountAggregateOutputType = {
    id: number
    workspaceId: number
    taskId: number
    checkpointStatus: number
    state: number
    goal: number
    correlationId: number
    retryCount: number
    stepHistoryJson: number
    waitingUserReason: number
    reason: number
    updatedAt: number
    createdAt: number
    _all: number
  }


  export type TaskCheckpointAvgAggregateInputType = {
    retryCount?: true
  }

  export type TaskCheckpointSumAggregateInputType = {
    retryCount?: true
  }

  export type TaskCheckpointMinAggregateInputType = {
    id?: true
    workspaceId?: true
    taskId?: true
    checkpointStatus?: true
    state?: true
    goal?: true
    correlationId?: true
    retryCount?: true
    stepHistoryJson?: true
    waitingUserReason?: true
    reason?: true
    updatedAt?: true
    createdAt?: true
  }

  export type TaskCheckpointMaxAggregateInputType = {
    id?: true
    workspaceId?: true
    taskId?: true
    checkpointStatus?: true
    state?: true
    goal?: true
    correlationId?: true
    retryCount?: true
    stepHistoryJson?: true
    waitingUserReason?: true
    reason?: true
    updatedAt?: true
    createdAt?: true
  }

  export type TaskCheckpointCountAggregateInputType = {
    id?: true
    workspaceId?: true
    taskId?: true
    checkpointStatus?: true
    state?: true
    goal?: true
    correlationId?: true
    retryCount?: true
    stepHistoryJson?: true
    waitingUserReason?: true
    reason?: true
    updatedAt?: true
    createdAt?: true
    _all?: true
  }

  export type TaskCheckpointAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskCheckpoint to aggregate.
     */
    where?: TaskCheckpointWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskCheckpoints to fetch.
     */
    orderBy?: TaskCheckpointOrderByWithRelationInput | TaskCheckpointOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskCheckpointWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskCheckpoints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskCheckpoints.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TaskCheckpoints
    **/
    _count?: true | TaskCheckpointCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TaskCheckpointAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TaskCheckpointSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskCheckpointMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskCheckpointMaxAggregateInputType
  }

  export type GetTaskCheckpointAggregateType<T extends TaskCheckpointAggregateArgs> = {
        [P in keyof T & keyof AggregateTaskCheckpoint]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTaskCheckpoint[P]>
      : GetScalarType<T[P], AggregateTaskCheckpoint[P]>
  }




  export type TaskCheckpointGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskCheckpointWhereInput
    orderBy?: TaskCheckpointOrderByWithAggregationInput | TaskCheckpointOrderByWithAggregationInput[]
    by: TaskCheckpointScalarFieldEnum[] | TaskCheckpointScalarFieldEnum
    having?: TaskCheckpointScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskCheckpointCountAggregateInputType | true
    _avg?: TaskCheckpointAvgAggregateInputType
    _sum?: TaskCheckpointSumAggregateInputType
    _min?: TaskCheckpointMinAggregateInputType
    _max?: TaskCheckpointMaxAggregateInputType
  }

  export type TaskCheckpointGroupByOutputType = {
    id: string
    workspaceId: string
    taskId: string
    checkpointStatus: string
    state: string
    goal: string
    correlationId: string
    retryCount: number
    stepHistoryJson: string
    waitingUserReason: string | null
    reason: string | null
    updatedAt: Date
    createdAt: Date
    _count: TaskCheckpointCountAggregateOutputType | null
    _avg: TaskCheckpointAvgAggregateOutputType | null
    _sum: TaskCheckpointSumAggregateOutputType | null
    _min: TaskCheckpointMinAggregateOutputType | null
    _max: TaskCheckpointMaxAggregateOutputType | null
  }

  type GetTaskCheckpointGroupByPayload<T extends TaskCheckpointGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskCheckpointGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskCheckpointGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskCheckpointGroupByOutputType[P]>
            : GetScalarType<T[P], TaskCheckpointGroupByOutputType[P]>
        }
      >
    >


  export type TaskCheckpointSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    checkpointStatus?: boolean
    state?: boolean
    goal?: boolean
    correlationId?: boolean
    retryCount?: boolean
    stepHistoryJson?: boolean
    waitingUserReason?: boolean
    reason?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["taskCheckpoint"]>

  export type TaskCheckpointSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    checkpointStatus?: boolean
    state?: boolean
    goal?: boolean
    correlationId?: boolean
    retryCount?: boolean
    stepHistoryJson?: boolean
    waitingUserReason?: boolean
    reason?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["taskCheckpoint"]>

  export type TaskCheckpointSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    checkpointStatus?: boolean
    state?: boolean
    goal?: boolean
    correlationId?: boolean
    retryCount?: boolean
    stepHistoryJson?: boolean
    waitingUserReason?: boolean
    reason?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["taskCheckpoint"]>

  export type TaskCheckpointSelectScalar = {
    id?: boolean
    workspaceId?: boolean
    taskId?: boolean
    checkpointStatus?: boolean
    state?: boolean
    goal?: boolean
    correlationId?: boolean
    retryCount?: boolean
    stepHistoryJson?: boolean
    waitingUserReason?: boolean
    reason?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }

  export type TaskCheckpointOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "workspaceId" | "taskId" | "checkpointStatus" | "state" | "goal" | "correlationId" | "retryCount" | "stepHistoryJson" | "waitingUserReason" | "reason" | "updatedAt" | "createdAt", ExtArgs["result"]["taskCheckpoint"]>

  export type $TaskCheckpointPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TaskCheckpoint"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      workspaceId: string
      taskId: string
      checkpointStatus: string
      state: string
      goal: string
      correlationId: string
      retryCount: number
      stepHistoryJson: string
      waitingUserReason: string | null
      reason: string | null
      updatedAt: Date
      createdAt: Date
    }, ExtArgs["result"]["taskCheckpoint"]>
    composites: {}
  }

  type TaskCheckpointGetPayload<S extends boolean | null | undefined | TaskCheckpointDefaultArgs> = $Result.GetResult<Prisma.$TaskCheckpointPayload, S>

  type TaskCheckpointCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskCheckpointFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskCheckpointCountAggregateInputType | true
    }

  export interface TaskCheckpointDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TaskCheckpoint'], meta: { name: 'TaskCheckpoint' } }
    /**
     * Find zero or one TaskCheckpoint that matches the filter.
     * @param {TaskCheckpointFindUniqueArgs} args - Arguments to find a TaskCheckpoint
     * @example
     * // Get one TaskCheckpoint
     * const taskCheckpoint = await prisma.taskCheckpoint.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskCheckpointFindUniqueArgs>(args: SelectSubset<T, TaskCheckpointFindUniqueArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TaskCheckpoint that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskCheckpointFindUniqueOrThrowArgs} args - Arguments to find a TaskCheckpoint
     * @example
     * // Get one TaskCheckpoint
     * const taskCheckpoint = await prisma.taskCheckpoint.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskCheckpointFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskCheckpointFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskCheckpoint that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCheckpointFindFirstArgs} args - Arguments to find a TaskCheckpoint
     * @example
     * // Get one TaskCheckpoint
     * const taskCheckpoint = await prisma.taskCheckpoint.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskCheckpointFindFirstArgs>(args?: SelectSubset<T, TaskCheckpointFindFirstArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskCheckpoint that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCheckpointFindFirstOrThrowArgs} args - Arguments to find a TaskCheckpoint
     * @example
     * // Get one TaskCheckpoint
     * const taskCheckpoint = await prisma.taskCheckpoint.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskCheckpointFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskCheckpointFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TaskCheckpoints that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCheckpointFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TaskCheckpoints
     * const taskCheckpoints = await prisma.taskCheckpoint.findMany()
     * 
     * // Get first 10 TaskCheckpoints
     * const taskCheckpoints = await prisma.taskCheckpoint.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskCheckpointWithIdOnly = await prisma.taskCheckpoint.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskCheckpointFindManyArgs>(args?: SelectSubset<T, TaskCheckpointFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TaskCheckpoint.
     * @param {TaskCheckpointCreateArgs} args - Arguments to create a TaskCheckpoint.
     * @example
     * // Create one TaskCheckpoint
     * const TaskCheckpoint = await prisma.taskCheckpoint.create({
     *   data: {
     *     // ... data to create a TaskCheckpoint
     *   }
     * })
     * 
     */
    create<T extends TaskCheckpointCreateArgs>(args: SelectSubset<T, TaskCheckpointCreateArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TaskCheckpoints.
     * @param {TaskCheckpointCreateManyArgs} args - Arguments to create many TaskCheckpoints.
     * @example
     * // Create many TaskCheckpoints
     * const taskCheckpoint = await prisma.taskCheckpoint.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskCheckpointCreateManyArgs>(args?: SelectSubset<T, TaskCheckpointCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TaskCheckpoints and returns the data saved in the database.
     * @param {TaskCheckpointCreateManyAndReturnArgs} args - Arguments to create many TaskCheckpoints.
     * @example
     * // Create many TaskCheckpoints
     * const taskCheckpoint = await prisma.taskCheckpoint.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TaskCheckpoints and only return the `id`
     * const taskCheckpointWithIdOnly = await prisma.taskCheckpoint.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskCheckpointCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskCheckpointCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TaskCheckpoint.
     * @param {TaskCheckpointDeleteArgs} args - Arguments to delete one TaskCheckpoint.
     * @example
     * // Delete one TaskCheckpoint
     * const TaskCheckpoint = await prisma.taskCheckpoint.delete({
     *   where: {
     *     // ... filter to delete one TaskCheckpoint
     *   }
     * })
     * 
     */
    delete<T extends TaskCheckpointDeleteArgs>(args: SelectSubset<T, TaskCheckpointDeleteArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TaskCheckpoint.
     * @param {TaskCheckpointUpdateArgs} args - Arguments to update one TaskCheckpoint.
     * @example
     * // Update one TaskCheckpoint
     * const taskCheckpoint = await prisma.taskCheckpoint.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskCheckpointUpdateArgs>(args: SelectSubset<T, TaskCheckpointUpdateArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TaskCheckpoints.
     * @param {TaskCheckpointDeleteManyArgs} args - Arguments to filter TaskCheckpoints to delete.
     * @example
     * // Delete a few TaskCheckpoints
     * const { count } = await prisma.taskCheckpoint.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskCheckpointDeleteManyArgs>(args?: SelectSubset<T, TaskCheckpointDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskCheckpoints.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCheckpointUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TaskCheckpoints
     * const taskCheckpoint = await prisma.taskCheckpoint.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskCheckpointUpdateManyArgs>(args: SelectSubset<T, TaskCheckpointUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskCheckpoints and returns the data updated in the database.
     * @param {TaskCheckpointUpdateManyAndReturnArgs} args - Arguments to update many TaskCheckpoints.
     * @example
     * // Update many TaskCheckpoints
     * const taskCheckpoint = await prisma.taskCheckpoint.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TaskCheckpoints and only return the `id`
     * const taskCheckpointWithIdOnly = await prisma.taskCheckpoint.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskCheckpointUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskCheckpointUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TaskCheckpoint.
     * @param {TaskCheckpointUpsertArgs} args - Arguments to update or create a TaskCheckpoint.
     * @example
     * // Update or create a TaskCheckpoint
     * const taskCheckpoint = await prisma.taskCheckpoint.upsert({
     *   create: {
     *     // ... data to create a TaskCheckpoint
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TaskCheckpoint we want to update
     *   }
     * })
     */
    upsert<T extends TaskCheckpointUpsertArgs>(args: SelectSubset<T, TaskCheckpointUpsertArgs<ExtArgs>>): Prisma__TaskCheckpointClient<$Result.GetResult<Prisma.$TaskCheckpointPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TaskCheckpoints.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCheckpointCountArgs} args - Arguments to filter TaskCheckpoints to count.
     * @example
     * // Count the number of TaskCheckpoints
     * const count = await prisma.taskCheckpoint.count({
     *   where: {
     *     // ... the filter for the TaskCheckpoints we want to count
     *   }
     * })
    **/
    count<T extends TaskCheckpointCountArgs>(
      args?: Subset<T, TaskCheckpointCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskCheckpointCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TaskCheckpoint.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCheckpointAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskCheckpointAggregateArgs>(args: Subset<T, TaskCheckpointAggregateArgs>): Prisma.PrismaPromise<GetTaskCheckpointAggregateType<T>>

    /**
     * Group by TaskCheckpoint.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCheckpointGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskCheckpointGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskCheckpointGroupByArgs['orderBy'] }
        : { orderBy?: TaskCheckpointGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskCheckpointGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskCheckpointGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TaskCheckpoint model
   */
  readonly fields: TaskCheckpointFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TaskCheckpoint.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskCheckpointClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TaskCheckpoint model
   */
  interface TaskCheckpointFieldRefs {
    readonly id: FieldRef<"TaskCheckpoint", 'String'>
    readonly workspaceId: FieldRef<"TaskCheckpoint", 'String'>
    readonly taskId: FieldRef<"TaskCheckpoint", 'String'>
    readonly checkpointStatus: FieldRef<"TaskCheckpoint", 'String'>
    readonly state: FieldRef<"TaskCheckpoint", 'String'>
    readonly goal: FieldRef<"TaskCheckpoint", 'String'>
    readonly correlationId: FieldRef<"TaskCheckpoint", 'String'>
    readonly retryCount: FieldRef<"TaskCheckpoint", 'Int'>
    readonly stepHistoryJson: FieldRef<"TaskCheckpoint", 'String'>
    readonly waitingUserReason: FieldRef<"TaskCheckpoint", 'String'>
    readonly reason: FieldRef<"TaskCheckpoint", 'String'>
    readonly updatedAt: FieldRef<"TaskCheckpoint", 'DateTime'>
    readonly createdAt: FieldRef<"TaskCheckpoint", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TaskCheckpoint findUnique
   */
  export type TaskCheckpointFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * Filter, which TaskCheckpoint to fetch.
     */
    where: TaskCheckpointWhereUniqueInput
  }

  /**
   * TaskCheckpoint findUniqueOrThrow
   */
  export type TaskCheckpointFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * Filter, which TaskCheckpoint to fetch.
     */
    where: TaskCheckpointWhereUniqueInput
  }

  /**
   * TaskCheckpoint findFirst
   */
  export type TaskCheckpointFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * Filter, which TaskCheckpoint to fetch.
     */
    where?: TaskCheckpointWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskCheckpoints to fetch.
     */
    orderBy?: TaskCheckpointOrderByWithRelationInput | TaskCheckpointOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskCheckpoints.
     */
    cursor?: TaskCheckpointWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskCheckpoints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskCheckpoints.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskCheckpoints.
     */
    distinct?: TaskCheckpointScalarFieldEnum | TaskCheckpointScalarFieldEnum[]
  }

  /**
   * TaskCheckpoint findFirstOrThrow
   */
  export type TaskCheckpointFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * Filter, which TaskCheckpoint to fetch.
     */
    where?: TaskCheckpointWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskCheckpoints to fetch.
     */
    orderBy?: TaskCheckpointOrderByWithRelationInput | TaskCheckpointOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskCheckpoints.
     */
    cursor?: TaskCheckpointWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskCheckpoints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskCheckpoints.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskCheckpoints.
     */
    distinct?: TaskCheckpointScalarFieldEnum | TaskCheckpointScalarFieldEnum[]
  }

  /**
   * TaskCheckpoint findMany
   */
  export type TaskCheckpointFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * Filter, which TaskCheckpoints to fetch.
     */
    where?: TaskCheckpointWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskCheckpoints to fetch.
     */
    orderBy?: TaskCheckpointOrderByWithRelationInput | TaskCheckpointOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TaskCheckpoints.
     */
    cursor?: TaskCheckpointWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskCheckpoints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskCheckpoints.
     */
    skip?: number
    distinct?: TaskCheckpointScalarFieldEnum | TaskCheckpointScalarFieldEnum[]
  }

  /**
   * TaskCheckpoint create
   */
  export type TaskCheckpointCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * The data needed to create a TaskCheckpoint.
     */
    data: XOR<TaskCheckpointCreateInput, TaskCheckpointUncheckedCreateInput>
  }

  /**
   * TaskCheckpoint createMany
   */
  export type TaskCheckpointCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TaskCheckpoints.
     */
    data: TaskCheckpointCreateManyInput | TaskCheckpointCreateManyInput[]
  }

  /**
   * TaskCheckpoint createManyAndReturn
   */
  export type TaskCheckpointCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * The data used to create many TaskCheckpoints.
     */
    data: TaskCheckpointCreateManyInput | TaskCheckpointCreateManyInput[]
  }

  /**
   * TaskCheckpoint update
   */
  export type TaskCheckpointUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * The data needed to update a TaskCheckpoint.
     */
    data: XOR<TaskCheckpointUpdateInput, TaskCheckpointUncheckedUpdateInput>
    /**
     * Choose, which TaskCheckpoint to update.
     */
    where: TaskCheckpointWhereUniqueInput
  }

  /**
   * TaskCheckpoint updateMany
   */
  export type TaskCheckpointUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TaskCheckpoints.
     */
    data: XOR<TaskCheckpointUpdateManyMutationInput, TaskCheckpointUncheckedUpdateManyInput>
    /**
     * Filter which TaskCheckpoints to update
     */
    where?: TaskCheckpointWhereInput
    /**
     * Limit how many TaskCheckpoints to update.
     */
    limit?: number
  }

  /**
   * TaskCheckpoint updateManyAndReturn
   */
  export type TaskCheckpointUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * The data used to update TaskCheckpoints.
     */
    data: XOR<TaskCheckpointUpdateManyMutationInput, TaskCheckpointUncheckedUpdateManyInput>
    /**
     * Filter which TaskCheckpoints to update
     */
    where?: TaskCheckpointWhereInput
    /**
     * Limit how many TaskCheckpoints to update.
     */
    limit?: number
  }

  /**
   * TaskCheckpoint upsert
   */
  export type TaskCheckpointUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * The filter to search for the TaskCheckpoint to update in case it exists.
     */
    where: TaskCheckpointWhereUniqueInput
    /**
     * In case the TaskCheckpoint found by the `where` argument doesn't exist, create a new TaskCheckpoint with this data.
     */
    create: XOR<TaskCheckpointCreateInput, TaskCheckpointUncheckedCreateInput>
    /**
     * In case the TaskCheckpoint was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskCheckpointUpdateInput, TaskCheckpointUncheckedUpdateInput>
  }

  /**
   * TaskCheckpoint delete
   */
  export type TaskCheckpointDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
    /**
     * Filter which TaskCheckpoint to delete.
     */
    where: TaskCheckpointWhereUniqueInput
  }

  /**
   * TaskCheckpoint deleteMany
   */
  export type TaskCheckpointDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskCheckpoints to delete
     */
    where?: TaskCheckpointWhereInput
    /**
     * Limit how many TaskCheckpoints to delete.
     */
    limit?: number
  }

  /**
   * TaskCheckpoint without action
   */
  export type TaskCheckpointDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCheckpoint
     */
    select?: TaskCheckpointSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskCheckpoint
     */
    omit?: TaskCheckpointOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const WorkingMemoryEntryScalarFieldEnum: {
    id: 'id',
    workspaceId: 'workspaceId',
    taskId: 'taskId',
    contentRef: 'contentRef',
    schemaVersion: 'schemaVersion',
    contentChecksum: 'contentChecksum',
    createdAt: 'createdAt'
  };

  export type WorkingMemoryEntryScalarFieldEnum = (typeof WorkingMemoryEntryScalarFieldEnum)[keyof typeof WorkingMemoryEntryScalarFieldEnum]


  export const RecentMemoryEntryScalarFieldEnum: {
    id: 'id',
    workspaceId: 'workspaceId',
    identityId: 'identityId',
    sourceTaskId: 'sourceTaskId',
    contentRef: 'contentRef',
    confidence: 'confidence',
    schemaVersion: 'schemaVersion',
    contentChecksum: 'contentChecksum',
    status: 'status',
    supersededById: 'supersededById',
    createdAt: 'createdAt'
  };

  export type RecentMemoryEntryScalarFieldEnum = (typeof RecentMemoryEntryScalarFieldEnum)[keyof typeof RecentMemoryEntryScalarFieldEnum]


  export const LongTermMemoryEntryScalarFieldEnum: {
    id: 'id',
    workspaceId: 'workspaceId',
    identityId: 'identityId',
    contentRef: 'contentRef',
    confidence: 'confidence',
    verifiedAt: 'verifiedAt',
    sourceLineageId: 'sourceLineageId',
    schemaVersion: 'schemaVersion',
    contentChecksum: 'contentChecksum'
  };

  export type LongTermMemoryEntryScalarFieldEnum = (typeof LongTermMemoryEntryScalarFieldEnum)[keyof typeof LongTermMemoryEntryScalarFieldEnum]


  export const TaskCheckpointScalarFieldEnum: {
    id: 'id',
    workspaceId: 'workspaceId',
    taskId: 'taskId',
    checkpointStatus: 'checkpointStatus',
    state: 'state',
    goal: 'goal',
    correlationId: 'correlationId',
    retryCount: 'retryCount',
    stepHistoryJson: 'stepHistoryJson',
    waitingUserReason: 'waitingUserReason',
    reason: 'reason',
    updatedAt: 'updatedAt',
    createdAt: 'createdAt'
  };

  export type TaskCheckpointScalarFieldEnum = (typeof TaskCheckpointScalarFieldEnum)[keyof typeof TaskCheckpointScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    
  /**
   * Deep Input Types
   */


  export type WorkingMemoryEntryWhereInput = {
    AND?: WorkingMemoryEntryWhereInput | WorkingMemoryEntryWhereInput[]
    OR?: WorkingMemoryEntryWhereInput[]
    NOT?: WorkingMemoryEntryWhereInput | WorkingMemoryEntryWhereInput[]
    id?: StringFilter<"WorkingMemoryEntry"> | string
    workspaceId?: StringFilter<"WorkingMemoryEntry"> | string
    taskId?: StringFilter<"WorkingMemoryEntry"> | string
    contentRef?: StringFilter<"WorkingMemoryEntry"> | string
    schemaVersion?: StringFilter<"WorkingMemoryEntry"> | string
    contentChecksum?: StringFilter<"WorkingMemoryEntry"> | string
    createdAt?: DateTimeFilter<"WorkingMemoryEntry"> | Date | string
  }

  export type WorkingMemoryEntryOrderByWithRelationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    contentRef?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    createdAt?: SortOrder
  }

  export type WorkingMemoryEntryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: WorkingMemoryEntryWhereInput | WorkingMemoryEntryWhereInput[]
    OR?: WorkingMemoryEntryWhereInput[]
    NOT?: WorkingMemoryEntryWhereInput | WorkingMemoryEntryWhereInput[]
    workspaceId?: StringFilter<"WorkingMemoryEntry"> | string
    taskId?: StringFilter<"WorkingMemoryEntry"> | string
    contentRef?: StringFilter<"WorkingMemoryEntry"> | string
    schemaVersion?: StringFilter<"WorkingMemoryEntry"> | string
    contentChecksum?: StringFilter<"WorkingMemoryEntry"> | string
    createdAt?: DateTimeFilter<"WorkingMemoryEntry"> | Date | string
  }, "id">

  export type WorkingMemoryEntryOrderByWithAggregationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    contentRef?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    createdAt?: SortOrder
    _count?: WorkingMemoryEntryCountOrderByAggregateInput
    _max?: WorkingMemoryEntryMaxOrderByAggregateInput
    _min?: WorkingMemoryEntryMinOrderByAggregateInput
  }

  export type WorkingMemoryEntryScalarWhereWithAggregatesInput = {
    AND?: WorkingMemoryEntryScalarWhereWithAggregatesInput | WorkingMemoryEntryScalarWhereWithAggregatesInput[]
    OR?: WorkingMemoryEntryScalarWhereWithAggregatesInput[]
    NOT?: WorkingMemoryEntryScalarWhereWithAggregatesInput | WorkingMemoryEntryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"WorkingMemoryEntry"> | string
    workspaceId?: StringWithAggregatesFilter<"WorkingMemoryEntry"> | string
    taskId?: StringWithAggregatesFilter<"WorkingMemoryEntry"> | string
    contentRef?: StringWithAggregatesFilter<"WorkingMemoryEntry"> | string
    schemaVersion?: StringWithAggregatesFilter<"WorkingMemoryEntry"> | string
    contentChecksum?: StringWithAggregatesFilter<"WorkingMemoryEntry"> | string
    createdAt?: DateTimeWithAggregatesFilter<"WorkingMemoryEntry"> | Date | string
  }

  export type RecentMemoryEntryWhereInput = {
    AND?: RecentMemoryEntryWhereInput | RecentMemoryEntryWhereInput[]
    OR?: RecentMemoryEntryWhereInput[]
    NOT?: RecentMemoryEntryWhereInput | RecentMemoryEntryWhereInput[]
    id?: StringFilter<"RecentMemoryEntry"> | string
    workspaceId?: StringFilter<"RecentMemoryEntry"> | string
    identityId?: StringFilter<"RecentMemoryEntry"> | string
    sourceTaskId?: StringFilter<"RecentMemoryEntry"> | string
    contentRef?: StringFilter<"RecentMemoryEntry"> | string
    confidence?: FloatFilter<"RecentMemoryEntry"> | number
    schemaVersion?: StringFilter<"RecentMemoryEntry"> | string
    contentChecksum?: StringFilter<"RecentMemoryEntry"> | string
    status?: StringFilter<"RecentMemoryEntry"> | string
    supersededById?: StringNullableFilter<"RecentMemoryEntry"> | string | null
    createdAt?: DateTimeFilter<"RecentMemoryEntry"> | Date | string
  }

  export type RecentMemoryEntryOrderByWithRelationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    sourceTaskId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    status?: SortOrder
    supersededById?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type RecentMemoryEntryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RecentMemoryEntryWhereInput | RecentMemoryEntryWhereInput[]
    OR?: RecentMemoryEntryWhereInput[]
    NOT?: RecentMemoryEntryWhereInput | RecentMemoryEntryWhereInput[]
    workspaceId?: StringFilter<"RecentMemoryEntry"> | string
    identityId?: StringFilter<"RecentMemoryEntry"> | string
    sourceTaskId?: StringFilter<"RecentMemoryEntry"> | string
    contentRef?: StringFilter<"RecentMemoryEntry"> | string
    confidence?: FloatFilter<"RecentMemoryEntry"> | number
    schemaVersion?: StringFilter<"RecentMemoryEntry"> | string
    contentChecksum?: StringFilter<"RecentMemoryEntry"> | string
    status?: StringFilter<"RecentMemoryEntry"> | string
    supersededById?: StringNullableFilter<"RecentMemoryEntry"> | string | null
    createdAt?: DateTimeFilter<"RecentMemoryEntry"> | Date | string
  }, "id">

  export type RecentMemoryEntryOrderByWithAggregationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    sourceTaskId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    status?: SortOrder
    supersededById?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: RecentMemoryEntryCountOrderByAggregateInput
    _avg?: RecentMemoryEntryAvgOrderByAggregateInput
    _max?: RecentMemoryEntryMaxOrderByAggregateInput
    _min?: RecentMemoryEntryMinOrderByAggregateInput
    _sum?: RecentMemoryEntrySumOrderByAggregateInput
  }

  export type RecentMemoryEntryScalarWhereWithAggregatesInput = {
    AND?: RecentMemoryEntryScalarWhereWithAggregatesInput | RecentMemoryEntryScalarWhereWithAggregatesInput[]
    OR?: RecentMemoryEntryScalarWhereWithAggregatesInput[]
    NOT?: RecentMemoryEntryScalarWhereWithAggregatesInput | RecentMemoryEntryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    workspaceId?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    identityId?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    sourceTaskId?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    contentRef?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    confidence?: FloatWithAggregatesFilter<"RecentMemoryEntry"> | number
    schemaVersion?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    contentChecksum?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    status?: StringWithAggregatesFilter<"RecentMemoryEntry"> | string
    supersededById?: StringNullableWithAggregatesFilter<"RecentMemoryEntry"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"RecentMemoryEntry"> | Date | string
  }

  export type LongTermMemoryEntryWhereInput = {
    AND?: LongTermMemoryEntryWhereInput | LongTermMemoryEntryWhereInput[]
    OR?: LongTermMemoryEntryWhereInput[]
    NOT?: LongTermMemoryEntryWhereInput | LongTermMemoryEntryWhereInput[]
    id?: StringFilter<"LongTermMemoryEntry"> | string
    workspaceId?: StringFilter<"LongTermMemoryEntry"> | string
    identityId?: StringFilter<"LongTermMemoryEntry"> | string
    contentRef?: StringFilter<"LongTermMemoryEntry"> | string
    confidence?: FloatFilter<"LongTermMemoryEntry"> | number
    verifiedAt?: DateTimeFilter<"LongTermMemoryEntry"> | Date | string
    sourceLineageId?: StringFilter<"LongTermMemoryEntry"> | string
    schemaVersion?: StringFilter<"LongTermMemoryEntry"> | string
    contentChecksum?: StringFilter<"LongTermMemoryEntry"> | string
  }

  export type LongTermMemoryEntryOrderByWithRelationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    verifiedAt?: SortOrder
    sourceLineageId?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
  }

  export type LongTermMemoryEntryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LongTermMemoryEntryWhereInput | LongTermMemoryEntryWhereInput[]
    OR?: LongTermMemoryEntryWhereInput[]
    NOT?: LongTermMemoryEntryWhereInput | LongTermMemoryEntryWhereInput[]
    workspaceId?: StringFilter<"LongTermMemoryEntry"> | string
    identityId?: StringFilter<"LongTermMemoryEntry"> | string
    contentRef?: StringFilter<"LongTermMemoryEntry"> | string
    confidence?: FloatFilter<"LongTermMemoryEntry"> | number
    verifiedAt?: DateTimeFilter<"LongTermMemoryEntry"> | Date | string
    sourceLineageId?: StringFilter<"LongTermMemoryEntry"> | string
    schemaVersion?: StringFilter<"LongTermMemoryEntry"> | string
    contentChecksum?: StringFilter<"LongTermMemoryEntry"> | string
  }, "id">

  export type LongTermMemoryEntryOrderByWithAggregationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    verifiedAt?: SortOrder
    sourceLineageId?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    _count?: LongTermMemoryEntryCountOrderByAggregateInput
    _avg?: LongTermMemoryEntryAvgOrderByAggregateInput
    _max?: LongTermMemoryEntryMaxOrderByAggregateInput
    _min?: LongTermMemoryEntryMinOrderByAggregateInput
    _sum?: LongTermMemoryEntrySumOrderByAggregateInput
  }

  export type LongTermMemoryEntryScalarWhereWithAggregatesInput = {
    AND?: LongTermMemoryEntryScalarWhereWithAggregatesInput | LongTermMemoryEntryScalarWhereWithAggregatesInput[]
    OR?: LongTermMemoryEntryScalarWhereWithAggregatesInput[]
    NOT?: LongTermMemoryEntryScalarWhereWithAggregatesInput | LongTermMemoryEntryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LongTermMemoryEntry"> | string
    workspaceId?: StringWithAggregatesFilter<"LongTermMemoryEntry"> | string
    identityId?: StringWithAggregatesFilter<"LongTermMemoryEntry"> | string
    contentRef?: StringWithAggregatesFilter<"LongTermMemoryEntry"> | string
    confidence?: FloatWithAggregatesFilter<"LongTermMemoryEntry"> | number
    verifiedAt?: DateTimeWithAggregatesFilter<"LongTermMemoryEntry"> | Date | string
    sourceLineageId?: StringWithAggregatesFilter<"LongTermMemoryEntry"> | string
    schemaVersion?: StringWithAggregatesFilter<"LongTermMemoryEntry"> | string
    contentChecksum?: StringWithAggregatesFilter<"LongTermMemoryEntry"> | string
  }

  export type TaskCheckpointWhereInput = {
    AND?: TaskCheckpointWhereInput | TaskCheckpointWhereInput[]
    OR?: TaskCheckpointWhereInput[]
    NOT?: TaskCheckpointWhereInput | TaskCheckpointWhereInput[]
    id?: StringFilter<"TaskCheckpoint"> | string
    workspaceId?: StringFilter<"TaskCheckpoint"> | string
    taskId?: StringFilter<"TaskCheckpoint"> | string
    checkpointStatus?: StringFilter<"TaskCheckpoint"> | string
    state?: StringFilter<"TaskCheckpoint"> | string
    goal?: StringFilter<"TaskCheckpoint"> | string
    correlationId?: StringFilter<"TaskCheckpoint"> | string
    retryCount?: IntFilter<"TaskCheckpoint"> | number
    stepHistoryJson?: StringFilter<"TaskCheckpoint"> | string
    waitingUserReason?: StringNullableFilter<"TaskCheckpoint"> | string | null
    reason?: StringNullableFilter<"TaskCheckpoint"> | string | null
    updatedAt?: DateTimeFilter<"TaskCheckpoint"> | Date | string
    createdAt?: DateTimeFilter<"TaskCheckpoint"> | Date | string
  }

  export type TaskCheckpointOrderByWithRelationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    checkpointStatus?: SortOrder
    state?: SortOrder
    goal?: SortOrder
    correlationId?: SortOrder
    retryCount?: SortOrder
    stepHistoryJson?: SortOrder
    waitingUserReason?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type TaskCheckpointWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TaskCheckpointWhereInput | TaskCheckpointWhereInput[]
    OR?: TaskCheckpointWhereInput[]
    NOT?: TaskCheckpointWhereInput | TaskCheckpointWhereInput[]
    workspaceId?: StringFilter<"TaskCheckpoint"> | string
    taskId?: StringFilter<"TaskCheckpoint"> | string
    checkpointStatus?: StringFilter<"TaskCheckpoint"> | string
    state?: StringFilter<"TaskCheckpoint"> | string
    goal?: StringFilter<"TaskCheckpoint"> | string
    correlationId?: StringFilter<"TaskCheckpoint"> | string
    retryCount?: IntFilter<"TaskCheckpoint"> | number
    stepHistoryJson?: StringFilter<"TaskCheckpoint"> | string
    waitingUserReason?: StringNullableFilter<"TaskCheckpoint"> | string | null
    reason?: StringNullableFilter<"TaskCheckpoint"> | string | null
    updatedAt?: DateTimeFilter<"TaskCheckpoint"> | Date | string
    createdAt?: DateTimeFilter<"TaskCheckpoint"> | Date | string
  }, "id">

  export type TaskCheckpointOrderByWithAggregationInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    checkpointStatus?: SortOrder
    state?: SortOrder
    goal?: SortOrder
    correlationId?: SortOrder
    retryCount?: SortOrder
    stepHistoryJson?: SortOrder
    waitingUserReason?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
    _count?: TaskCheckpointCountOrderByAggregateInput
    _avg?: TaskCheckpointAvgOrderByAggregateInput
    _max?: TaskCheckpointMaxOrderByAggregateInput
    _min?: TaskCheckpointMinOrderByAggregateInput
    _sum?: TaskCheckpointSumOrderByAggregateInput
  }

  export type TaskCheckpointScalarWhereWithAggregatesInput = {
    AND?: TaskCheckpointScalarWhereWithAggregatesInput | TaskCheckpointScalarWhereWithAggregatesInput[]
    OR?: TaskCheckpointScalarWhereWithAggregatesInput[]
    NOT?: TaskCheckpointScalarWhereWithAggregatesInput | TaskCheckpointScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    workspaceId?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    taskId?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    checkpointStatus?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    state?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    goal?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    correlationId?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    retryCount?: IntWithAggregatesFilter<"TaskCheckpoint"> | number
    stepHistoryJson?: StringWithAggregatesFilter<"TaskCheckpoint"> | string
    waitingUserReason?: StringNullableWithAggregatesFilter<"TaskCheckpoint"> | string | null
    reason?: StringNullableWithAggregatesFilter<"TaskCheckpoint"> | string | null
    updatedAt?: DateTimeWithAggregatesFilter<"TaskCheckpoint"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"TaskCheckpoint"> | Date | string
  }

  export type WorkingMemoryEntryCreateInput = {
    id: string
    workspaceId: string
    taskId: string
    contentRef: string
    schemaVersion: string
    contentChecksum: string
    createdAt?: Date | string
  }

  export type WorkingMemoryEntryUncheckedCreateInput = {
    id: string
    workspaceId: string
    taskId: string
    contentRef: string
    schemaVersion: string
    contentChecksum: string
    createdAt?: Date | string
  }

  export type WorkingMemoryEntryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkingMemoryEntryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkingMemoryEntryCreateManyInput = {
    id: string
    workspaceId: string
    taskId: string
    contentRef: string
    schemaVersion: string
    contentChecksum: string
    createdAt?: Date | string
  }

  export type WorkingMemoryEntryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkingMemoryEntryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecentMemoryEntryCreateInput = {
    id: string
    workspaceId: string
    identityId: string
    sourceTaskId: string
    contentRef: string
    confidence: number
    schemaVersion: string
    contentChecksum: string
    status?: string
    supersededById?: string | null
    createdAt?: Date | string
  }

  export type RecentMemoryEntryUncheckedCreateInput = {
    id: string
    workspaceId: string
    identityId: string
    sourceTaskId: string
    contentRef: string
    confidence: number
    schemaVersion: string
    contentChecksum: string
    status?: string
    supersededById?: string | null
    createdAt?: Date | string
  }

  export type RecentMemoryEntryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    sourceTaskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    supersededById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecentMemoryEntryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    sourceTaskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    supersededById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecentMemoryEntryCreateManyInput = {
    id: string
    workspaceId: string
    identityId: string
    sourceTaskId: string
    contentRef: string
    confidence: number
    schemaVersion: string
    contentChecksum: string
    status?: string
    supersededById?: string | null
    createdAt?: Date | string
  }

  export type RecentMemoryEntryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    sourceTaskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    supersededById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecentMemoryEntryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    sourceTaskId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    supersededById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LongTermMemoryEntryCreateInput = {
    id: string
    workspaceId: string
    identityId: string
    contentRef: string
    confidence: number
    verifiedAt: Date | string
    sourceLineageId: string
    schemaVersion: string
    contentChecksum: string
  }

  export type LongTermMemoryEntryUncheckedCreateInput = {
    id: string
    workspaceId: string
    identityId: string
    contentRef: string
    confidence: number
    verifiedAt: Date | string
    sourceLineageId: string
    schemaVersion: string
    contentChecksum: string
  }

  export type LongTermMemoryEntryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    verifiedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceLineageId?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
  }

  export type LongTermMemoryEntryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    verifiedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceLineageId?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
  }

  export type LongTermMemoryEntryCreateManyInput = {
    id: string
    workspaceId: string
    identityId: string
    contentRef: string
    confidence: number
    verifiedAt: Date | string
    sourceLineageId: string
    schemaVersion: string
    contentChecksum: string
  }

  export type LongTermMemoryEntryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    verifiedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceLineageId?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
  }

  export type LongTermMemoryEntryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    identityId?: StringFieldUpdateOperationsInput | string
    contentRef?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    verifiedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceLineageId?: StringFieldUpdateOperationsInput | string
    schemaVersion?: StringFieldUpdateOperationsInput | string
    contentChecksum?: StringFieldUpdateOperationsInput | string
  }

  export type TaskCheckpointCreateInput = {
    id: string
    workspaceId: string
    taskId: string
    checkpointStatus: string
    state: string
    goal: string
    correlationId: string
    retryCount: number
    stepHistoryJson: string
    waitingUserReason?: string | null
    reason?: string | null
    updatedAt: Date | string
    createdAt?: Date | string
  }

  export type TaskCheckpointUncheckedCreateInput = {
    id: string
    workspaceId: string
    taskId: string
    checkpointStatus: string
    state: string
    goal: string
    correlationId: string
    retryCount: number
    stepHistoryJson: string
    waitingUserReason?: string | null
    reason?: string | null
    updatedAt: Date | string
    createdAt?: Date | string
  }

  export type TaskCheckpointUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    checkpointStatus?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    goal?: StringFieldUpdateOperationsInput | string
    correlationId?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    stepHistoryJson?: StringFieldUpdateOperationsInput | string
    waitingUserReason?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCheckpointUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    checkpointStatus?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    goal?: StringFieldUpdateOperationsInput | string
    correlationId?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    stepHistoryJson?: StringFieldUpdateOperationsInput | string
    waitingUserReason?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCheckpointCreateManyInput = {
    id: string
    workspaceId: string
    taskId: string
    checkpointStatus: string
    state: string
    goal: string
    correlationId: string
    retryCount: number
    stepHistoryJson: string
    waitingUserReason?: string | null
    reason?: string | null
    updatedAt: Date | string
    createdAt?: Date | string
  }

  export type TaskCheckpointUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    checkpointStatus?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    goal?: StringFieldUpdateOperationsInput | string
    correlationId?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    stepHistoryJson?: StringFieldUpdateOperationsInput | string
    waitingUserReason?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCheckpointUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    checkpointStatus?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    goal?: StringFieldUpdateOperationsInput | string
    correlationId?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    stepHistoryJson?: StringFieldUpdateOperationsInput | string
    waitingUserReason?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type WorkingMemoryEntryCountOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    contentRef?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    createdAt?: SortOrder
  }

  export type WorkingMemoryEntryMaxOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    contentRef?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    createdAt?: SortOrder
  }

  export type WorkingMemoryEntryMinOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    contentRef?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    createdAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type RecentMemoryEntryCountOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    sourceTaskId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    status?: SortOrder
    supersededById?: SortOrder
    createdAt?: SortOrder
  }

  export type RecentMemoryEntryAvgOrderByAggregateInput = {
    confidence?: SortOrder
  }

  export type RecentMemoryEntryMaxOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    sourceTaskId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    status?: SortOrder
    supersededById?: SortOrder
    createdAt?: SortOrder
  }

  export type RecentMemoryEntryMinOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    sourceTaskId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
    status?: SortOrder
    supersededById?: SortOrder
    createdAt?: SortOrder
  }

  export type RecentMemoryEntrySumOrderByAggregateInput = {
    confidence?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type LongTermMemoryEntryCountOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    verifiedAt?: SortOrder
    sourceLineageId?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
  }

  export type LongTermMemoryEntryAvgOrderByAggregateInput = {
    confidence?: SortOrder
  }

  export type LongTermMemoryEntryMaxOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    verifiedAt?: SortOrder
    sourceLineageId?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
  }

  export type LongTermMemoryEntryMinOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    identityId?: SortOrder
    contentRef?: SortOrder
    confidence?: SortOrder
    verifiedAt?: SortOrder
    sourceLineageId?: SortOrder
    schemaVersion?: SortOrder
    contentChecksum?: SortOrder
  }

  export type LongTermMemoryEntrySumOrderByAggregateInput = {
    confidence?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type TaskCheckpointCountOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    checkpointStatus?: SortOrder
    state?: SortOrder
    goal?: SortOrder
    correlationId?: SortOrder
    retryCount?: SortOrder
    stepHistoryJson?: SortOrder
    waitingUserReason?: SortOrder
    reason?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type TaskCheckpointAvgOrderByAggregateInput = {
    retryCount?: SortOrder
  }

  export type TaskCheckpointMaxOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    checkpointStatus?: SortOrder
    state?: SortOrder
    goal?: SortOrder
    correlationId?: SortOrder
    retryCount?: SortOrder
    stepHistoryJson?: SortOrder
    waitingUserReason?: SortOrder
    reason?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type TaskCheckpointMinOrderByAggregateInput = {
    id?: SortOrder
    workspaceId?: SortOrder
    taskId?: SortOrder
    checkpointStatus?: SortOrder
    state?: SortOrder
    goal?: SortOrder
    correlationId?: SortOrder
    retryCount?: SortOrder
    stepHistoryJson?: SortOrder
    waitingUserReason?: SortOrder
    reason?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type TaskCheckpointSumOrderByAggregateInput = {
    retryCount?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}