package com.observability.sdk.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to automatically trace a method
 * 
 * Usage:
 * @Traced("custom-operation-name")
 * public void myMethod() { ... }
 * 
 * @Traced(kind = "CLIENT")
 * public void callExternalService() { ... }
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Traced {
    
    /**
     * Operation name for the span
     * Defaults to ClassName.methodName
     */
    String value() default "";
    
    /**
     * Span kind: INTERNAL, SERVER, CLIENT, PRODUCER, CONSUMER
     */
    String kind() default "INTERNAL";
}

