package com.observability.sdk.interceptor;

import com.observability.sdk.annotation.Traced;
import com.observability.sdk.tracing.TracingService;
import com.observability.sdk.tracing.TracingService.SpanContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * AOP interceptor for @Traced annotation
 * Automatically creates spans for annotated methods
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class TracingInterceptor {

    private final TracingService tracingService;

    @Around("@annotation(com.observability.sdk.annotation.Traced)")
    public Object traceMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Traced traced = signature.getMethod().getAnnotation(Traced.class);

        String operationName = traced.value().isEmpty() 
                ? signature.getDeclaringType().getSimpleName() + "." + signature.getName()
                : traced.value();

        SpanContext spanContext = tracingService.startSpan(operationName, traced.kind());

        try {
            Object result = joinPoint.proceed();
            
            if (spanContext != null) {
                Map<String, String> attributes = new HashMap<>();
                attributes.put("class", signature.getDeclaringType().getName());
                attributes.put("method", signature.getName());
                tracingService.endSpan(spanContext, "OK", attributes);
            }
            
            return result;
        } catch (Throwable t) {
            if (spanContext != null) {
                Map<String, String> attributes = new HashMap<>();
                attributes.put("class", signature.getDeclaringType().getName());
                attributes.put("method", signature.getName());
                attributes.put("error.type", t.getClass().getName());
                attributes.put("error.message", t.getMessage() != null ? t.getMessage() : "");
                tracingService.endSpan(spanContext, "ERROR", attributes);
            }
            throw t;
        }
    }
}

