/*
 * Copyright (c) 2018 MariaDB Corporation Ab
 *
 * Use of this software is governed by the Business Source License included
 * in the LICENSE.TXT file and at www.mariadb.com/bsl11.
 *
 * Change Date: 2023-11-05
 *
 * On the date above, in accordance with the Business Source License, use
 * of this software will be governed by version 2 or later of the General
 * Public License.
 */
#pragma once

/**
 * @file authenticator.hh
 *
 * The authenticator module interface definitions for MaxScale
 */

#include <maxscale/ccdefs.hh>
#include <memory>
#include <string>

/**
 * The MXS_AUTHENTICATOR version data. The following should be updated whenever
 * the MXS_AUTHENTICATOR structure is changed. See the rules defined in modinfo.h
 * that define how these numbers should change.
 */
#define MXS_AUTHENTICATOR_VERSION {3, 0, 0}

/** Maximum number of authenticator options */
#define AUTHENTICATOR_MAX_OPTIONS 256

/** Return values for the loadusers entry point */
#define MXS_AUTH_LOADUSERS_OK    0  /**< Users loaded successfully */
#define MXS_AUTH_LOADUSERS_ERROR 1  /**< Temporary error, service is started */
#define MXS_AUTH_LOADUSERS_FATAL 2  /**< Fatal error, service is not started */

namespace maxscale
{

class AuthenticatorModuleBase
{
public:
    /**
     * Get name of supported protocol module.
     *
     * @return Supported protocol
     */
    virtual std::string supported_protocol() const = 0;

    /**
     * Get the module name.
     *
     * @return Module name
     */
    virtual std::string name() const = 0;
};

/**
 * This struct contains the authenticator entrypoint in a shared library.
 */
struct AUTHENTICATOR_API
{
    /**
     * Create an authenticator module instance.
     *
     * @param options Authenticator options
     * @return Authenticator object, or null on error
     */
    mxs::AuthenticatorModuleBase* (* initialize)(char** options);
};

template<class AuthenticatorImplementation>
class AuthenticatorApiGenerator
{
public:
    AuthenticatorApiGenerator() = delete;
    AuthenticatorApiGenerator(const AuthenticatorApiGenerator&) = delete;
    AuthenticatorApiGenerator& operator=(const AuthenticatorApiGenerator&) = delete;

    static AuthenticatorModuleBase* createInstance(char** options)
    {
        AuthenticatorModuleBase* instance = nullptr;
        MXS_EXCEPTION_GUARD(instance = AuthenticatorImplementation::create(options));
        return instance;
    }

    static AUTHENTICATOR_API s_api;
};

template<class AuthenticatorImplementation>
AUTHENTICATOR_API AuthenticatorApiGenerator<AuthenticatorImplementation>::s_api =
{
    &AuthenticatorApiGenerator<AuthenticatorImplementation>::createInstance
};
}

namespace maxscale
{
std::unique_ptr<mxs::AuthenticatorModuleBase> authenticator_init(const char* authenticator,
                                                                 const char* options);
}
